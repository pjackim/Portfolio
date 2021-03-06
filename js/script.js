function setBounds() {
    var canvas = document.getElementsByClassName("particular")[0];
    var wrapper = document.getElementById("text-carousel-intro-section").firstElementChild;
    
    // console.log("Width:\t", window.getComputedStyle(wrapper).width);
    // console.log("Height:\t", window.getComputedStyle(wrapper).height);

    // canvas.setAttribute("width", window.getComputedStyle(wrapper).width);
    canvas.setAttribute("width", 1920);
    canvas.setAttribute("height", window.getComputedStyle(wrapper).height);
}


// $(window).load(function() {
// 	// "use strict";
//     $(".loader").fadeOut(500, function() {
//         $(".particular").animate({
//             opacity: "1"
//         }, 500);
 
//     });
//     // setBounds();
// });




$(".box li a").on("mouseenter", function() {
		var goTo = $(this).attr("href");
		$(".iframe-holder iframe").attr("src",goTo);
	});
 
(function ($, window) {
 
    function Constellation (canvas, options) {
        var $canvas = $(canvas),
            context = canvas.getContext('2d'),
            defaults = {
                star: {
                    color: 'rgba(255, 255,255, .8)',
                    width: 1
                },
                line: {
                    color: 'rgba(242, 107, 29, 1)',
                    width: 1
                },
                position: {
                    x: canvas.width * 1,
                    y: canvas.height * 0.5
                },
                width: window.innerWidth,
                height: window.innerHeight,
                velocity: .3,
                length: 300,
                distance: 80,
                radius: 150,
                stars: []
            },
            config = $.extend(true, {}, defaults, options);

        function Star () {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;

            this.vx = (config.velocity - (Math.random() * 1));
            this.vy = (config.velocity - (Math.random() * 1));

            this.radius = Math.random() * config.star.width;
        }

        Star.prototype = {
            create: function(){
                context.beginPath();
                context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
                context.fill();
            },

            animate: function(){
                var i;
                for (i = 0; i < config.length; i++) {

                    var star = config.stars[i];

                    if (star.y < 0 || star.y > canvas.height) {
                        star.vx = star.vx;
                        star.vy = - star.vy;
                    } else if (star.x < 0 || star.x > canvas.width) {
                        star.vx = - star.vx;
                        star.vy = star.vy;
                    }

                    star.x += star.vx;
                    star.y += star.vy;
                }
            },

            line: function(){
                var length = config.length,
                    iStar,
                    jStar,
                    i,
                    j;

                for (i = 0; i < length; i++) {
                    for (j = 0; j < length; j++) {
                        iStar = config.stars[i];
                        jStar = config.stars[j];

                        if (
                            (iStar.x - jStar.x) < config.distance &&
                            (iStar.y - jStar.y) < config.distance &&
                            (iStar.x - jStar.x) > - config.distance &&
                            (iStar.y - jStar.y) > - config.distance
                        ) {
                            if (
                                (iStar.x - config.position.x) < config.radius &&
                                (iStar.y - config.position.y) < config.radius &&
                                (iStar.x - config.position.x) > - config.radius &&
                                (iStar.y - config.position.y) > - config.radius
                            ) {
                                context.beginPath();
                                context.moveTo(iStar.x, iStar.y);
                                context.lineTo(jStar.x, jStar.y);
                                context.stroke();
                                context.closePath();
                            }
                        }
                    }
                }
            }
        };

        this.createStars = function () {
            var length = config.length,
                star,
                i;

            context.clearRect(0, 0, canvas.width, canvas.height);

            for (i = 0; i < length; i++) {
                config.stars.push(new Star());
                star = config.stars[i];

                star.create();
            }

            if (star != null) {
                star.line();
                star.animate();
            }
        };

        this.setCanvas = function () {
            setBounds();
        };

        this.setContext = function () {
            context.fillStyle = config.star.color;
            context.strokeStyle = config.line.color;
            context.lineWidth = config.line.width;
        };

        this.loop = function (callback) {
            callback();

            window.requestAnimationFrame(function () {
                this.loop(callback);
            }.bind(this));
        };

        this.bind = function () {
            $(window).on('mousemove', function(e){
                config.position.x = e.pageX - $canvas.offset().left;
                config.position.y = e.pageY - $canvas.offset().top;
            });
        };

        this.init = function () {
            setBounds();
            this.setCanvas();
            this.setContext();
            this.loop(this.createStars);
            this.bind();
        };
    }

    $.fn.constellation = function (options) {
        return this.each(function () {
            var c = new Constellation(this, options);
            c.init();
        });
    };
})($, window);	
    $(".particular").constellation({
        star: {
            width: 2
        },
        line: {
            color: "rgba(242, 143, 56, .5)"
        },
        radius: 250
    });	


    function a() {
        // var canvas = document.getElementsByClassName("particular")[0];
        var wrapper = document.getElementById("text-carousel-intro-section").firstElementChild;
        var length = parseInt(window.getComputedStyle(wrapper).width, 10);
        length = parseInt(length / 3, 10);
        // console.log("Width:\t", window.getComputedStyle(wrapper).width);
        // console.log("Height:\t", window.getComputedStyle(wrapper).height);
    
        // canvas.setAttribute("width", window.getComputedStyle(wrapper).width);
        // canvas.setAttribute("height", window.getComputedStyle(wrapper).height);

        console.log("Length: ", length);
        $(".particular").constellation({
            star: {
                width: 2
            },
            line: {
                color: "rgba(242, 143, 56, .5)"
            },
            radius: 250
            // length: $(length)
        });	
    }
    a();
    $(window).resize(function() {
       a(); 
    });