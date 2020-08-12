
(function($){ //create closure so we can safely use $ as alias for jQuery

    $(document).ready(function(){

        "use strict";
		
        /*-----------------------------------------------------------------------------------*/
        /*  Superfish Menu
        /*-----------------------------------------------------------------------------------*/
        // initialise plugin
        var example = $('.sf-menu').superfish({
            //add options here if required
            delay:       100,
            speed:       'fast',
            autoArrows:  false  
        }); 

        /*-----------------------------------------------------------------------------------*/
        /*  Slick Mobile Menu
        /*-----------------------------------------------------------------------------------*/
        $('#primary-menu').slicknav({
            prependTo: '#slick-mobile-menu',
            allowParentLinks: true,
            label:'Menu'            
        });

        /*-----------------------------------------------------------------------------------*/
        /*  Back to Top
        /*-----------------------------------------------------------------------------------*/
        // hide #back-top first
        $("#back-top").hide();

        $(function () {
            // fade in #back-top
            $(window).scroll(function () {
                if ($(this).scrollTop() > 100) {
                    $('#back-top').fadeIn('200');
                } else {
                    $('#back-top').fadeOut('200');
                }
            });

            // scroll body to 0px on click
            $('#back-top a').click(function () {
                $('body,html').animate({
                    scrollTop: 0
                }, 400);
                return false;
            });
        });                                     
        

    });

})(jQuery);