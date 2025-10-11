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
    // Add event listener for video end to ensure looping
    var videoElement = document.getElementById('main-video');
    videoElement.addEventListener('ended', function() {
        this.currentTime = 0;
        this.play().catch(function(error) {
            console.log('Loop play prevented:', error);
        });
    });
    
    // Add click event listeners to thumbnail items
    $('.thumbnail-item').on('click', function() {
        // Remove active class from all thumbnails
        $('.thumbnail-item').removeClass('active');
        
        // Add active class to clicked thumbnail
        $(this).addClass('active');
        
        // Get video and viser data from the clicked thumbnail
        var videoSrc = $(this).data('video');
        var viserSrc = $(this).data('viser');
        var thumbnailLabel = $(this).find('.thumbnail-label').text();
        
        // Update video source
        var videoElement = document.getElementById('main-video');
        videoElement.src = './static/videos/' + videoSrc;
        videoElement.load(); // Reload the video
        
        // Ensure video plays automatically when loaded
        videoElement.addEventListener('loadeddata', function() {
            videoElement.play().catch(function(error) {
                console.log('Autoplay prevented:', error);
            });
        });
        
        // Update video info
        $('.video-title').text(thumbnailLabel + ' Execution');
        
        // Update Viser iframe source
        var viserIframe = document.getElementById('viser-iframe');
        viserIframe.src = viserSrc;
        
        // Update Viser info
        $('.viser-title').text('3D Object Flow for ' + thumbnailLabel);
    });
    
    // Initialize with first thumbnail as active
    $('.thumbnail-item').first().trigger('click');
}
