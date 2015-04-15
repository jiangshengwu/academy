// create element based on the template
var createJqueryEl = function (tpl, params) {
    tpl = tpl || '';
    params = params || {};
    for (var attr in params) {
        var regexp = new RegExp('%' + attr + '%', 'g');
        tpl = tpl.replace(regexp, params[attr]);
    }
    return $(tpl);
};

var header_tpl = '<li class="js-dot dot" index=%index%>\
    <span class="dot__glyph"></span><div style="position:relative;">\
    <div class="tooltip"><a href="javascript:void(0);"><span>%tip%</span></a>\
    </div></div></li>';

var step_item_tpl = '<a class="js-highlight-control-item highlight-control highlight-control--item new-cc-icon" index=%index%></a>'

var CONVERTER = new Showdown.converter();

// command process
var handleCommand = function(command, term) {
    if (command !== '') {
        try {
            var result = eval(command);
            if (result !== undefined) {
                term.echo(String(result));
            }
        } catch (e) {
            term.error(String(e));
        }
    } else {
        term.echo('');
    }
}

$(function () {
    var $terminal = $('#terminal');
    $terminal.terminal(handleCommand, {
        greetings: 'Welcome!',
        name: 'emulator',
        prompt: '[root@localhost ~]$ '
    });

    var callBack = function (config) {
        console.log(config);

        // title, favicon and logo
        $('title').html(config['title']);
        $('#favicon_img').attr('href', config['favicon']);
        $('#header_logo_img').attr('src', config['logo']).bind('click', function() {
            setCompleted();
        });

        // page controller on header
        for (var i = 0, len = config['pages'].length; i < len; i++) {
            var $el = createJqueryEl(header_tpl, {
                index: i,
                tip: config['pages'][i].title
            });
            if (i == 0) {
                $el.addClass('dot--start');
                $el.attr('state', 'completed current');
            }
            if (i == len - 1 && i != 0) {
                $el.addClass('dot--composer');
            }
            $el.find('span.dot__glyph').bind('click', function() {
                var $li = $(this).parent();
                var state = $li.attr('state');
                if (state && state.length > 0) {
                    switchPage(parseInt($li.attr('index')));
                }
            });
            $('#header_ul').append($el);
        }

        // prev/next step controller event
        $('a[arrow]').bind('click', function() {
           var s = parseInt($('.js-highlight-control-item[state="current"]').attr('index'));
            if ($(this).hasClass('js-highlight-control-prev')) {
                --s;
            } else if ($(this).hasClass('js-highlight-control-next')) {
                ++s;
            }
            switchStep(getCurrentPageIndex(), s);
        });

        var getCurrentPageIndex = function() {
            return parseInt($('#page_article').attr('current'));
        }

        /* pages */
        var switchPage = function (index) {
            var $article = $('#page_article');
            if (getCurrentPageIndex() === index) {
                return;
            }
            $article.attr('current', index);
            var page = config['pages'][index];
            var $left = $('#left_in_page');
            var $right = $('#right_in_page');
            var $step = $('#step_controller');

            // header buttons
            $('li.js-dot').each(function(i, e) {
                var s = $(e).attr('state');
                if (s) {
                    $(e).attr('state', s.replace(/\s?current\s?/, ''));
                }
            });
            var $cli = $('li.js-dot[index="' + index + '"]');
            var state = $cli.attr('state');
            state = (state || '') + ' current';
            $cli.attr('state', state);

            // next page button
            if (state && state.indexOf('completed') >= 0) {
                $('#next_page').attr('state', '');
            } else {
                $('#next_page').attr('state', 'disabled');
            }

            // page title
            var $title = $('#title_in_page');
            $title.animate({ opacity: 0 }, 100, function() {
                $title.animate({ opacity: 1 }, 100, function() {
                    $title.html(page.title);
                });
            });

            // page step controller
            $step.children('.highlight-control--item').remove();
            $step.children('.highlight-control--prev').attr('state', 'disabled');
            if (page.step_number > 1) {
                $step.children('.highlight-control--next').attr('state', '');
            }
            var $node;
            for (var i = 0; i < page.step_number; i++) {
                $el = createJqueryEl(step_item_tpl, {
                    index: i
                });
                if (i == 0) {
                    $el.attr('state', 'current');
                }
                $el.bind('click', function() {
                    switchStep(index, parseInt($(this).attr('index')));
                });
                if ($node) {
                    $node.after($el);
                } else {
                    $step.children('.highlight-control--prev').after($el);
                }
                $node = $el;
            }

            // terminal
            if (page.terminal_visible === true) {
                if ($right.is(":hidden")) {
                    $right.css('opacity', 0);
                    $right.show();
                    $left.removeClass('grid-col-12');
                    $left.addClass('grid-col-l');
                    $right.animate({ opacity: 1 }, 100);
                }
            } else {
                $right.hide();
                if ($left.hasClass('grid-col-l')) {
                    $left.removeClass('grid-col-l');
                    $left.addClass('grid-col-12');
                }
            }

            // switch to step 0
            switchStep(index, 0);
        }

        var switchStep = function(p, s) {
            var page = config['pages'][p];
            $('a.js-highlight-control-item[state="current"]').attr('state', '');
            $('a.js-highlight-control-item[index="' + s + '"]').attr('state', 'current');
            if (s == 0) {
                $('a.js-highlight-control-prev').attr('state', 'disabled');
            } else {
                $('a.js-highlight-control-prev').attr('state', '');
            }
            if (s == page.step_number - 1) {
                $('a.js-highlight-control-next').attr('state', 'disabled');
            } else {
                $('a.js-highlight-control-next').attr('state', '');
            }
            var $left = $('#left_in_page');
            $.get(page.md_path + '/' + p + '-' + s + '.md' , {
                t: new Date().getTime()
            }, function(data) {
                $left.children('div').html(CONVERTER.makeHtml(data));
            });
        }

        switchPage(0);

        //prev/next page controller event
        $('#prev_page').bind('click', function() {
            var p = getCurrentPageIndex();
            if (p == 0) {
                return false;
            }
            switchPage(--p);
        });
        $('#next_page').bind('click', function() {
            var p = getCurrentPageIndex();
            if (p == config['pages'].length - 1) {
                return false;
            }
            var state = $(this).attr('state');
            if (!state || state.trim().length == 0) {
                switchPage(++p);
            }
        });

        var setCompleted = function() {
            var p = getCurrentPageIndex();
            var $li = $('li.js-dot[index="' + p + '"]');
            var s = $li.attr('state');
            if (s && s.indexOf('completed') >= 0) {
                return;
            }
            s = (s || '') + ' completed';
            $li.attr('state', s);
            $('#next_page').attr('state', '');
        }
    };

    // get config file
    $.getJSON('config.json', {
        t: new Date().getTime()
    }, callBack);

});