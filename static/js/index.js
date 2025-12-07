window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

// Centralized method name to link mapping
// Define all your method links here once, and they'll be automatically applied
var METHOD_LINKS = {
    "Dream2Flow": "https://dream2flow.github.io/",
    "AVDC": "https://flow-diffusion.github.io/",
    "RIGVID": "https://rigvid-robot.github.io/",
    "Veo 3": "https://deepmind.google/models/veo/",
    "Kling 2.1": "https://klingai.com/global/",
    "Wan2.1": "https://wan.video/"
};

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
    
    // Robustness Hover Card functionality
    initializeRobustnessHoverCards();

    // Task tab switching functionality
    initializeTaskTabs();

})

// 3D Flow Visualization Widget Functions
function initializeVisualizationWidget() {
    var thumbnails = Array.from(document.querySelectorAll('.thumbnail-item'));
    var prevButton = document.querySelector('.thumbnail-nav.is-prev');
    var nextButton = document.querySelector('.thumbnail-nav.is-next');
    var dotsContainer = document.querySelector('.thumbnail-dots');
    var visibleRadius = 2;
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

        var viserIframe = document.getElementById('viser-iframe');
        viserIframe.src = viserSrc;

        // Show/hide thumbnails with smooth transitions
        thumbnails.forEach(function(thumb, i) {
            // Use linear distance instead of circular to avoid wrapping around
            var distance = Math.abs(i - index);
            var shouldShow = distance <= visibleRadius + 1;
            if (shouldShow) {
                thumb.classList.remove('is-hidden');
            } else {
                thumb.classList.add('is-hidden');
            }
        });

        // Wait for opacity transition (200ms) before scrolling for smoother animation
        setTimeout(function() {
            targetThumbnail.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 50);

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

// Helper function to parse scores from various formats (e.g., "90%", "7/10", "0.9")
function parseScore(scoreText) {
    if (!scoreText) return 0;
    
    // Handle percentage format (e.g., "90%")
    if (scoreText.includes('%')) {
        return parseFloat(scoreText.replace('%', ''));
    }
    
    // Handle fraction format (e.g., "7/10")
    if (scoreText.includes('/')) {
        var parts = scoreText.split('/');
        if (parts.length === 2) {
            var numerator = parseFloat(parts[0]);
            var denominator = parseFloat(parts[1]);
            if (denominator !== 0) {
                return (numerator / denominator) * 100;
            }
        }
    }
    
    // Handle decimal format (e.g., "0.9")
    var num = parseFloat(scoreText);
    if (!isNaN(num)) {
        if (num <= 1.0) {
            return num * 100;
        }
        return num;
    }
    
    return 0;
}

// Robustness Hover Card Functionality
function initializeRobustnessHoverCards() {
    // Create hover card element
    var hoverCard = $('<div class="robustness-hover-card"></div>');
    $('body').append(hoverCard);
    
    var currentWrapper = null;
    var hideTimeout = null;
    
    function showHoverCard(wrapper, e) {
        clearTimeout(hideTimeout);
        currentWrapper = wrapper;
        
        var refTitle = $(wrapper).data('ref-title');
        var refImage = $(wrapper).data('ref-image');
        var refDesc = $(wrapper).data('ref-desc');
        var refSuccess = $(wrapper).data('ref-success') || '';
        var modTitle = $(wrapper).data('mod-title');
        var modImage = $(wrapper).data('mod-image');
        var modDesc = $(wrapper).data('mod-desc');
        var modSuccess = $(wrapper).data('mod-success') || '';
        
        // Calculate relative improvement for modified scenario (compared to reference)
        var improvementIndicator = '';
        if (refSuccess && modSuccess) {
            var refScore = parseScore(refSuccess);
            var modScore = parseScore(modSuccess);
            var improvement = modScore - refScore; // How much better/worse modified is compared to reference
            var improvementRounded = Math.round(improvement);
            if (improvementRounded > 0) {
                improvementIndicator = '<span class="improvement-indicator positive">+' + improvementRounded + '%</span>';
            } else if (improvementRounded < 0) {
                improvementIndicator = '<span class="improvement-indicator negative">' + improvementRounded + '%</span>';
            } else {
                improvementIndicator = '<span class="improvement-indicator neutral">0%</span>';
            }
        }
        
        // Build card content
        var cardHTML = '';
        
        // Reference Scenario Section
        cardHTML += '<div class="hover-card-section">';
        cardHTML += '<div class="hover-card-title">' + refTitle;
        if (refSuccess) {
            cardHTML += ' <span class="success-rate">' + refSuccess + '</span>';
        }
        cardHTML += '</div>';
        cardHTML += '<img class="hover-card-image" src="' + refImage + '" alt="' + refTitle + '">';
        cardHTML += '<div class="hover-card-description">' + refDesc + '</div>';
        cardHTML += '</div>';
        
        // Modified Scenario Section
        cardHTML += '<div class="hover-card-section">';
        cardHTML += '<div class="hover-card-title">' + modTitle;
        if (modSuccess) {
            cardHTML += ' <span class="success-rate">' + modSuccess + '</span>';
        }
        if (improvementIndicator) {
            cardHTML += ' ' + improvementIndicator;
        }
        cardHTML += '</div>';
        cardHTML += '<img class="hover-card-image" src="' + modImage + '" alt="' + modTitle + '">';
        cardHTML += '<div class="hover-card-description">' + modDesc + '</div>';
        cardHTML += '</div>';
        
        hoverCard.html(cardHTML);
        
        // Position card near cursor
        positionHoverCard(e);
        
        // Show card
        hoverCard.addClass('visible');
    }
    
    function hideHoverCard() {
        hideTimeout = setTimeout(function() {
            hoverCard.removeClass('visible');
            currentWrapper = null;
        }, 100);
    }
    
    function positionHoverCard(e) {
        var cardWidth = 320;
        var cardHeight = hoverCard.outerHeight();
        var offsetX = 20;
        var offsetY = 20;
        
        // Use viewport-relative coordinates for fixed positioning
        var cursorX = (e.clientX !== undefined) ? e.clientX : e.originalEvent.clientX;
        var cursorY = (e.clientY !== undefined) ? e.clientY : e.originalEvent.clientY;
        
        var posX = cursorX + offsetX;
        // Vertically center the card around the cursor
        if (!cardHeight || cardHeight <= 0) {
            cardHeight = 200; // fallback to a reasonable default
        }
        var posY = cursorY - Math.round(cardHeight / 2);
        
        // Keep card within viewport (no scroll offsets needed for fixed elements)
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();
        
        // Horizontal overflow handling: prefer right side, otherwise place to the left
        if (posX + cardWidth > windowWidth) {
            posX = Math.max(8, cursorX - cardWidth - offsetX);
        }
        
        // Vertical clamping with small margins
        if (posY < 8) {
            posY = 8;
        } else if (posY + cardHeight > windowHeight - 8) {
            posY = Math.max(8, windowHeight - cardHeight - 8);
        }
        
        hoverCard.css({
            left: posX + 'px',
            top: posY + 'px'
        });
    }
    
    // Attach event handlers to robustness video wrappers
    $('.robustness-video-wrapper').on('mouseenter', function(e) {
        showHoverCard(this, e);
    });
    
    $('.robustness-video-wrapper').on('mousemove', function(e) {
        if (currentWrapper === this) {
            positionHoverCard(e);
        }
    });
    
    $('.robustness-video-wrapper').on('mouseleave', function() {
        hideHoverCard();
    });
}

// Task Tab Switching Functionality
function initializeTaskTabs() {
    var taskTabs = document.querySelectorAll('.task-tab');
    var taskGrids = {
        'task1': document.getElementById('task1-grid'),
        'task2': document.getElementById('task2-grid')
    };

    if (!taskTabs.length || !taskGrids.task1 || !taskGrids.task2) {
        return;
    }

    function switchTask(selectedTask) {
        // Update tab states
        taskTabs.forEach(function(tab) {
            if (tab.dataset.task === selectedTask) {
                tab.classList.add('is-active');
            } else {
                tab.classList.remove('is-active');
            }
        });

        // Update grid visibility
        Object.keys(taskGrids).forEach(function(task) {
            if (task === selectedTask) {
                taskGrids[task].style.display = 'block';
            } else {
                taskGrids[task].style.display = 'none';
            }
        });
    }

    // Add click handlers to tabs
    taskTabs.forEach(function(tab) {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            var task = tab.dataset.task;
            switchTask(task);
        });
    });
}
