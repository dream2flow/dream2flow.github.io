window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    preloadInterpolationImages();

    $('#interpolation-slider').on('input', function(event) {
      setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    bulmaSlider.attach();

    // 3D Flow Visualization functionality
    initializeVisualizationWidget();

})

// 3D Flow Visualization Widget Functions
function initializeVisualizationWidget() {
    var thumbnails = Array.from(document.querySelectorAll('.thumbnail-item'));
    var prevButton = document.querySelector('.thumbnail-nav.is-prev');
    var nextButton = document.querySelector('.thumbnail-nav.is-next');
    var dotsContainer = document.querySelector('.thumbnail-dots');
    var visibleRadius = 1;
    var activeIndex = 0;

    if (!thumbnails.length || !dotsContainer) {
        return;
    }

    dotsContainer.innerHTML = '';
    thumbnails.forEach(function(_, idx) {
        var dot = document.createElement('button');
        dot.className = 'thumbnail-dot' + (idx === 0 ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Scene ' + (idx + 1));
        dot.addEventListener('click', function() {
            updateActiveThumbnail(idx, true);
        });
        dotsContainer.appendChild(dot);
    });

    var dots = Array.from(dotsContainer.querySelectorAll('.thumbnail-dot'));

    function circularDistance(a, b, length) {
        var diff = Math.abs(a - b);
        return Math.min(diff, length - diff);
    }

    function updateDots(index) {
        dots.forEach(function(dot, i) {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function handleSelection(index) {
        var targetThumbnail = thumbnails[index];

        $('.thumbnail-item').removeClass('active');
        targetThumbnail.classList.add('active');

        var videoSrc = targetThumbnail.dataset.video;
        var viserSrc = targetThumbnail.dataset.viser;
        var thumbnailLabel = targetThumbnail.dataset.label;

        var videoElement = document.getElementById('main-video');
        videoElement.src = './static/videos/' + videoSrc;
        videoElement.load();
        videoElement.addEventListener('loadeddata', function handler() {
            videoElement.removeEventListener('loadeddata', handler);
            videoElement.play().catch(function(error) {
                console.log('Autoplay prevented:', error);
            });
        });

        $('.video-title').text(thumbnailLabel + ' Execution');

        var viserIframe = document.getElementById('viser-iframe');
        viserIframe.src = viserSrc;
        $('.viser-title').text('3D Object Flow for ' + thumbnailLabel);

        thumbnails.forEach(function(thumb, i) {
            var distance = circularDistance(i, index, thumbnails.length);
            var shouldShow = distance <= visibleRadius + 1;
            if (shouldShow) {
                thumb.classList.remove('is-hidden');
            } else {
                thumb.classList.add('is-hidden');
            }
        });

        targetThumbnail.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

        activeIndex = index;
        updateDots(activeIndex);
    }

    function getNextIndex(direction) {
        return (activeIndex + direction + thumbnails.length) % thumbnails.length;
    }

    function updateActiveThumbnail(index, forceUpdate) {
        if (!forceUpdate && index === activeIndex) {
            return;
        }
        handleSelection(index);
    }

    if (prevButton && nextButton) {
        prevButton.addEventListener('click', function() {
            updateActiveThumbnail(getNextIndex(-1), true);
        });

        nextButton.addEventListener('click', function() {
            updateActiveThumbnail(getNextIndex(1), true);
        });
    }

    var videoElement = document.getElementById('main-video');
    videoElement.addEventListener('ended', function() {
        this.currentTime = 0;
        this.play().catch(function(error) {
            console.log('Loop play prevented:', error);
        });
    });

    $('.thumbnail-item').on('click', function() {
        var clickedIndex = thumbnails.indexOf(this);
        updateActiveThumbnail(clickedIndex, true);
    });

    handleSelection(0);
}
