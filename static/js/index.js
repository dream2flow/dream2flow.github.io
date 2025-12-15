window.HELP_IMPROVE_VIDEOJS = false;

// Prevent auto-scroll on page load
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}

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
    // Force scroll to top immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Lock scroll position during initialization
    var scrollLocked = true;
    var scrollLockHandler = function(e) {
        if (scrollLocked) {
            window.scrollTo(0, 0);
            e.preventDefault();
        }
    };
    
    window.addEventListener('scroll', scrollLockHandler, { passive: false });
    
    // Unlock scroll after initialization completes
    setTimeout(function() {
        scrollLocked = false;
        window.removeEventListener('scroll', scrollLockHandler);
    }, 500);
    
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

    // Video zoom functionality for comparison videos
    initializeVideoZoom();

    // Failure modes Sankey diagram functionality
    initializeFailureModes();

    // Interactive method diagram functionality
    initializeMethodDiagram();

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
            updateActiveThumbnail(idx, true, false);
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

    // Video syncing state
    var syncedVideos = {
        master: null,
        slaves: [],
        isSyncing: false,
        syncHandler: null
    };

    function syncTopRowVideos(generatedVideoSrc, videoDepthSrc, tracks2dSrc) {
        // Clear previous sync handlers
        if (syncedVideos.syncHandler) {
            if (syncedVideos.master) {
                syncedVideos.master.removeEventListener('timeupdate', syncedVideos.syncHandler);
                syncedVideos.master.removeEventListener('play', syncedVideos.syncHandler);
                syncedVideos.master.removeEventListener('pause', syncedVideos.syncHandler);
                syncedVideos.master.removeEventListener('seeked', syncedVideos.syncHandler);
            }
        }
        syncedVideos.master = null;
        syncedVideos.slaves = [];
        syncedVideos.isSyncing = false;

        var videosToLoad = [];
        var loadedCount = 0;
        var totalVideos = 0;

        // Setup Generated Video (master)
        if (generatedVideoSrc) {
            totalVideos++;
            var generatedVideoElement = document.getElementById('generated-video');
            var generatedVideoSource = generatedVideoElement.querySelector('source');
            generatedVideoSource.src = './static/videos/' + generatedVideoSrc;
            generatedVideoElement.load();
            
            var loadHandler = function() {
                loadedCount++;
                if (loadedCount === totalVideos) {
                    startSyncedPlayback();
                }
            };
            
            generatedVideoElement.addEventListener('loadeddata', loadHandler, { once: true });
            videosToLoad.push({ element: generatedVideoElement, src: generatedVideoSrc });
            syncedVideos.master = generatedVideoElement;
        }

        // Setup Video Depth (slave)
        if (videoDepthSrc) {
            totalVideos++;
            var videoDepthElement = document.getElementById('video-depth');
            var videoDepthSource = videoDepthElement.querySelector('source');
            videoDepthSource.src = './static/videos/' + videoDepthSrc;
            videoDepthElement.load();
            
            var loadHandler = function() {
                loadedCount++;
                if (loadedCount === totalVideos) {
                    startSyncedPlayback();
                }
            };
            
            videoDepthElement.addEventListener('loadeddata', loadHandler, { once: true });
            videosToLoad.push({ element: videoDepthElement, src: videoDepthSrc });
            syncedVideos.slaves.push(videoDepthElement);
        }

        // Setup 2D Tracks (slave)
        if (tracks2dSrc) {
            var tracks2dElement = document.getElementById('tracks-2d');
            if (!tracks2dElement) {
                console.error('tracks-2d element not found');
            } else {
                totalVideos++;
                var tracks2dSource = tracks2dElement.querySelector('source');
                if (!tracks2dSource) {
                    console.error('tracks-2d source element not found');
                } else {
                    tracks2dSource.src = './static/videos/' + tracks2dSrc;
                    tracks2dElement.load();
            
            var loadHandler = function() {
                loadedCount++;
                if (loadedCount === totalVideos) {
                    startSyncedPlayback();
                }
            };
            
                    tracks2dElement.addEventListener('loadeddata', loadHandler, { once: true });
                    videosToLoad.push({ element: tracks2dElement, src: tracks2dSrc });
                    syncedVideos.slaves.push(tracks2dElement);
                }
            }
        }

        // If no videos to load, return early
        if (totalVideos === 0) {
            return;
        }

        function startSyncedPlayback() {
            if (!syncedVideos.master || syncedVideos.isSyncing) {
                return;
            }

            syncedVideos.isSyncing = true;

            // Sync all videos to master's current time
            var masterTime = syncedVideos.master.currentTime;
            syncedVideos.slaves.forEach(function(slave) {
                if (slave.readyState >= 2) { // HAVE_CURRENT_DATA
                    try {
                        slave.currentTime = masterTime;
                    } catch (e) {
                        // Video might not be ready yet, ignore
                        console.log('Could not sync slave video:', e);
                    }
                }
            });

            // Create sync handler
            syncedVideos.syncHandler = function() {
                if (!syncedVideos.isSyncing || !syncedVideos.master) {
                    return;
                }

                var masterTime = syncedVideos.master.currentTime;
                var masterPaused = syncedVideos.master.paused;

                // Sync slaves to master
                syncedVideos.slaves.forEach(function(slave) {
                    if (slave.readyState >= 2) { // HAVE_CURRENT_DATA
                        try {
                            var timeDiff = Math.abs(slave.currentTime - masterTime);
                            // Only sync if difference is significant (more than 0.1 seconds)
                            if (timeDiff > 0.1) {
                                slave.currentTime = masterTime;
                            }
                        } catch (e) {
                            // Video might not be ready, ignore
                        }

                        // Sync play/pause state
                        if (masterPaused && !slave.paused) {
                            slave.pause();
                        } else if (!masterPaused && slave.paused) {
                            slave.play().catch(function(error) {
                                console.log('Slave video play prevented:', error);
                            });
                        }
                    }
                });
            };

            // Attach event listeners to master
            syncedVideos.master.addEventListener('timeupdate', syncedVideos.syncHandler);
            syncedVideos.master.addEventListener('play', syncedVideos.syncHandler);
            syncedVideos.master.addEventListener('pause', syncedVideos.syncHandler);
            syncedVideos.master.addEventListener('seeked', function() {
                // When master seeks, immediately sync all slaves
                var masterTime = syncedVideos.master.currentTime;
                syncedVideos.slaves.forEach(function(slave) {
                    if (slave.readyState >= 2) {
                        try {
                            slave.currentTime = masterTime;
                        } catch (e) {
                            // Video might not be ready, ignore
                        }
                    }
                });
            });

            // Start playback
            syncedVideos.master.play().catch(function(error) {
                console.log('Master video autoplay prevented:', error);
            });
        }
    }

    function handleSelection(index, isInitialLoad) {
        var targetThumbnail = thumbnails[index];

        $('.thumbnail-item').removeClass('active');
        targetThumbnail.classList.add('active');

        var videoSrc = targetThumbnail.dataset.executionVideo;
        var viserSrc = targetThumbnail.dataset.viser;
        var thumbnailLabel = targetThumbnail.dataset.label;
        var inputRgbSrc = targetThumbnail.dataset.inputRgb;
        var generatedVideoSrc = targetThumbnail.dataset.generatedVideo;
        var videoDepthSrc = targetThumbnail.dataset.videoDepth;
        var tracks2dSrc = targetThumbnail.getAttribute('data-tracks-2d');

        // Update Robot Execution video
        var videoElement = document.getElementById('main-video');
        videoElement.src = './static/videos/' + videoSrc;
        videoElement.load();
        videoElement.addEventListener('loadeddata', function handler() {
            videoElement.removeEventListener('loadeddata', handler);
            videoElement.play().catch(function(error) {
                console.log('Autoplay prevented:', error);
            });
        });

        // Update Viser iframe
        var viserIframe = document.getElementById('viser-iframe');
        // Store current scroll position to prevent unwanted scrolling
        var scrollX = window.scrollX;
        var scrollY = window.scrollY;
        viserIframe.src = viserSrc;
        // Restore scroll position immediately after setting src
        if (isInitialLoad) {
            // Force to top on initial load
            requestAnimationFrame(function() {
                window.scrollTo(0, 0);
            });
        } else {
            window.scrollTo(scrollX, scrollY);
        }

        // Update Input RGB
        if (inputRgbSrc) {
            var inputRgbElement = document.getElementById('input-rgb');
            inputRgbElement.src = './static/images/' + inputRgbSrc;
        }

        // Update and sync top row videos (Generated Video, Video Depth, 2D Tracks)
        syncTopRowVideos(generatedVideoSrc, videoDepthSrc, tracks2dSrc);

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

    function updateActiveThumbnail(index, forceUpdate, isInitialLoad) {
        if (!forceUpdate && index === activeIndex) {
            return;
        }
        handleSelection(index, isInitialLoad);
    }

    if (prevButton && nextButton) {
        prevButton.addEventListener('click', function() {
            updateActiveThumbnail(getNextIndex(-1), true, false);
        });

        nextButton.addEventListener('click', function() {
            updateActiveThumbnail(getNextIndex(1), true, false);
        });
    }

    var videoElement = document.getElementById('main-video');
    videoElement.addEventListener('ended', function() {
        this.currentTime = 0;
        this.play().catch(function(error) {
            console.log('Loop play prevented:', error);
        });
    });

    // Add loop handlers for synced videos
    // The master video (generated-video) controls looping for all synced videos
    var generatedVideoElement = document.getElementById('generated-video');
    if (generatedVideoElement) {
        generatedVideoElement.addEventListener('ended', function() {
            // Reset all synced videos to start
            this.currentTime = 0;
            if (syncedVideos.slaves) {
                syncedVideos.slaves.forEach(function(slave) {
                    try {
                        slave.currentTime = 0;
                    } catch (e) {
                        // Video might not be ready, ignore
                    }
                });
            }
            // Restart playback
            this.play().catch(function(error) {
                console.log('Generated video loop play prevented:', error);
            });
        });
    }

    $('.thumbnail-item').on('click', function() {
        var clickedIndex = thumbnails.indexOf(this);
        updateActiveThumbnail(clickedIndex, true, false);
    });

    // Initial selection - mark as initial load to prevent scrolling
    handleSelection(0, true);
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

// Video Zoom Functionality
function initializeVideoZoom() {
    // Create zoom lens element
    var zoomLens = $('<div class="video-zoom-lens"></div>');
    var zoomCanvas = $('<canvas></canvas>');
    zoomLens.append(zoomCanvas);
    $('body').append(zoomLens);
    
    var canvas = zoomCanvas[0];
    var ctx = canvas.getContext('2d');
    
    // Set canvas size
    var lensSize = 250;
    canvas.width = lensSize;
    canvas.height = lensSize;
    
    var zoomFactor = 1.00;
    var currentVideo = null;
    var animationFrameId = null;
    
    function showZoomLens(video, e) {
        currentVideo = video;
        
        // Position lens near cursor
        positionZoomLens(e);
        
        // Show lens
        zoomLens.addClass('visible');
        
        // Start animation loop for drawing zoomed video
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(drawZoom);
        }
    }
    
    function hideZoomLens() {
        zoomLens.removeClass('visible');
        currentVideo = null;
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    
    function positionZoomLens(e) {
        var offsetX = 15;
        
        // Use viewport-relative coordinates
        var cursorX = e.clientX;
        var cursorY = e.clientY;
        
        var posX = cursorX + offsetX;
        var posY = cursorY - Math.round(lensSize / 2);
        
        // Keep lens within viewport
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();
        
        // Horizontal overflow handling - use same offset when flipping to left for consistency
        if (posX + lensSize > windowWidth - 20) {
            posX = cursorX - lensSize - offsetX;
        }
        
        // Vertical clamping
        if (posY < 20) {
            posY = 20;
        } else if (posY + lensSize > windowHeight - 20) {
            posY = windowHeight - lensSize - 20;
        }
        
        zoomLens.css({
            left: posX + 'px',
            top: posY + 'px'
        });
    }
    
    var lastMouseEvent = null;
    
    function drawZoom() {
        if (!currentVideo || !lastMouseEvent) {
            animationFrameId = null;
            return;
        }
        
        // Get video element position and size
        var videoRect = currentVideo.getBoundingClientRect();
        var videoWidth = currentVideo.videoWidth;
        var videoHeight = currentVideo.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) {
            animationFrameId = requestAnimationFrame(drawZoom);
            return;
        }
        
        // Calculate mouse position relative to video
        var mouseX = lastMouseEvent.clientX - videoRect.left;
        var mouseY = lastMouseEvent.clientY - videoRect.top;
        
        // Convert to video coordinates
        var scaleX = videoWidth / videoRect.width;
        var scaleY = videoHeight / videoRect.height;
        
        var videoMouseX = mouseX * scaleX;
        var videoMouseY = mouseY * scaleY;
        
        // Calculate the region to zoom
        var zoomRegionWidth = lensSize / zoomFactor;
        var zoomRegionHeight = lensSize / zoomFactor;
        
        var sourceX = videoMouseX - zoomRegionWidth / 2;
        var sourceY = videoMouseY - zoomRegionHeight / 2;
        
        // Clamp source coordinates to video bounds
        sourceX = Math.max(0, Math.min(sourceX, videoWidth - zoomRegionWidth));
        sourceY = Math.max(0, Math.min(sourceY, videoHeight - zoomRegionHeight));
        
        // Clear canvas
        ctx.clearRect(0, 0, lensSize, lensSize);
        
        // Draw zoomed video region
        try {
            ctx.drawImage(
                currentVideo,
                sourceX, sourceY, zoomRegionWidth, zoomRegionHeight,
                0, 0, lensSize, lensSize
            );
        } catch (e) {
            // Video might not be ready yet
            console.log('Could not draw video:', e);
        }
        
        // Continue animation loop
        animationFrameId = requestAnimationFrame(drawZoom);
    }
    
    // Attach event handlers to comparison grid videos
    var comparisonVideos = $('#task1-grid video, #task2-grid video');
    
    comparisonVideos.on('mouseenter', function(e) {
        showZoomLens(this, e);
    });
    
    comparisonVideos.on('mousemove', function(e) {
        if (currentVideo === this) {
            lastMouseEvent = e;
            positionZoomLens(e);
        }
    });
    
    comparisonVideos.on('mouseleave', function() {
        hideZoomLens();
    });
}

// Failure Modes Sankey Diagram Functionality
function initializeFailureModes() {
    var sankeyContainer = document.querySelector('.sankey-container');
    var failureTitle = document.getElementById('failure-title');
    var failureDescription = document.getElementById('failure-description');
    var failureVideo = document.getElementById('failure-video');
    var failureVideoSource = document.getElementById('failure-video-source');
    var failureCaption = document.getElementById('failure-caption');

    if (!sankeyContainer || !failureTitle || !failureDescription || !failureVideo) {
        return;
    }

    // Failure mode data
    var failureModes = {
        'object_morphing': {
            title: 'Object Morphing',
            description: 'The video generation model substantially changes the shape or appearance of the object, making 2D tracking fail.',
            video: './static/videos/failures/object_morphing.mp4',
            caption: 'The bread morphs into a stack of crackers in the generated video.'
        },
        'hallucination': {
            title: 'Hallucination',
            description: 'The video generation model creates unrealistic or physically impossible scenarios, such as new objects magically appearing. These hallucinations make the generated motion unsuitable for robot execution.',
            video: './static/videos/failures/hallucination.mp4',
            caption: 'A new bowl appears out of thin air in the generated video.'
        },
        'flow_extraction': {
            title: 'Flow Extraction Failures',
            description: 'The 3D flow extraction pipeline fails to accurately generate 3D flow from the generated video. This can occur due to 2D tracking failures from severe occlusions, certain rotations, or incorrect masks.',
            video: './static/videos/failures/flow_extraction.mp4',
            caption: '2D tracking fails due to challenging rotation of the bread in the generated video. The open circles indicate occlusion and will not be used when lifted into 3D.'
        },
        'robot_execution': {
            title: 'Robot Execution Failures',
            description: 'The robot fails to successfully plan or execute the trajectory despite having reasonable 3D object flow. This can occur due to a missed grasp, misplaced grasp, or a limitation of the rigid-grasp dynamics model.',
            video: './static/videos/failures/robot_execution.mp4',
            caption: 'The selected grasp pose and rigid-grasp dynamics model plan and execute a motion that misses the bowl.'
        }
    };

    // Get all clickable endpoint elements (both node rects and labels)
    var endpoints = sankeyContainer.querySelectorAll('.sankey-endpoint, .sankey-label-endpoint');
    var currentSelection = 'object_morphing'; // Default selection

    function selectFailureMode(failureType) {
        if (!failureModes[failureType]) {
            return;
        }

        currentSelection = failureType;
        var data = failureModes[failureType];

        // Update content
        failureTitle.textContent = data.title;
        failureDescription.textContent = data.description;
        
        // Update video
        failureVideoSource.src = data.video;
        failureVideo.load();
        failureVideo.play().catch(function(error) {
            console.log('Failure video autoplay prevented:', error);
        });

        // Update caption
        if (failureCaption) {
            failureCaption.textContent = data.caption;
        }

        // Update active states
        endpoints.forEach(function(endpoint) {
            var endpointFailure = endpoint.getAttribute('data-failure');
            if (endpointFailure === failureType) {
                endpoint.classList.add('active');
            } else {
                endpoint.classList.remove('active');
            }
        });

        // Add selection class to container
        sankeyContainer.classList.add('has-selection');
    }

    // Add click handlers to endpoints
    endpoints.forEach(function(endpoint) {
        endpoint.addEventListener('click', function() {
            var failureType = this.getAttribute('data-failure');
            selectFailureMode(failureType);
        });
    });

    // Initialize with default selection
    selectFailureMode('object_morphing');
}

// Interactive Method Diagram Functionality
function initializeMethodDiagram() {
    var hotspots = document.querySelectorAll('.method-hotspot');
    var explanationCard = document.getElementById('method-explanation-card');
    var explanationTitle = document.getElementById('method-explanation-title');
    var explanationContent = document.getElementById('method-explanation-content');
    var closeButton = document.getElementById('method-explanation-close');

    if (!hotspots.length || !explanationCard) {
        return;
    }

    // Component explanations data
    var componentData = {
        'inputs': {
            title: 'Inputs: Task Instruction & RGB-D Observation',
            content: 'The pipeline starts with two inputs: a <strong>natural language task instruction</strong> (e.g., "Put the bread in the bowl") and an <strong>RGB-D observation</strong> from the robot\'s camera. The RGB image provides visual context, while the depth channel (D) captures 3D geometry of the scene. These inputs define what the robot should do and the initial state of the environment.',
            highlightResults: true
        },
        'video-gen': {
            title: 'Video Generation Model',
            content: 'A state-of-the-art <strong>image-to-video generation model</strong> takes the initial RGB image and task instruction to synthesize a video showing how a human would perform the task. This leverages the model\'s learned understanding of object interactions and physics from large-scale video training data, providing plausible motion trajectories without requiring robot-specific training.',
            highlightResults: true
        },
        'video-frames': {
            title: 'Video Frames',
            content: 'The video generation model outputs a sequence of <strong>video frames</strong> depicting the task being performed (typically by imagining human hands). Each frame captures the progressive state of objects as they move according to the task instruction. These frames serve as the source for extracting object motion information.',
            highlightResults: true
        },
        'mask': {
            title: 'Object Mask',
            content: 'A <strong>segmentation model</strong> (such as SAM) generates object masks that identify which pixels belong to the object of interest in each frame. These masks are essential for isolating the object\'s motion from background elements and ensuring accurate tracking of the relevant object throughout the video.',
            highlightResults: false
        },
        'video-depth': {
            title: 'Video Depth',
            content: 'A <strong>monocular depth estimation model</strong> predicts depth maps for each generated video frame. Combined with the initial RGB-D observation\'s known scale, these depth estimates allow lifting 2D pixel motions into 3D space. This is crucial for understanding the full 3D trajectory of objects.',
            highlightResults: true
        },
        '2d-tracks': {
            title: '2D Point Tracking',
            content: '<strong>Point tracking models</strong> (such as CoTracker) follow individual points on the object across all video frames. These 2D trajectories capture how each sampled point on the object moves through the video. The tracks provide dense motion information that, when combined with depth, yields 3D motion.',
            highlightResults: true
        },
        '3d-flow': {
            title: '3D Object Flow',
            content: 'By combining 2D point tracks, depth estimates, object masks, and camera intrinsics, we reconstruct the <strong>3D object flow</strong>—the full 3D trajectory of points on the object over time. This representation captures how the object should move in 3D space to complete the task, serving as the target for robot control.',
            highlightResults: true
        },
        'controller': {
            title: 'Model-Based Controller',
            content: 'A <strong>trajectory optimization-based controller</strong> takes the 3D object flow and computes robot actions to track it. The controller uses a dynamics model to predict how robot actions affect object motion, then optimizes to find actions that make the real object follow the desired 3D trajectory. This produces executable low-level commands for the robot.',
            highlightResults: true
        }
    };

    var currentSelection = null;
    var currentHighlight = null;

    function clearHighlight() {
        if (currentHighlight) {
            currentHighlight.classList.remove('results-highlight');
            currentHighlight = null;
        }
    }

    function highlightResultsElement(elementId) {
        clearHighlight();
        
        if (!elementId) return;

        var element = document.getElementById(elementId);
        if (element) {
            // Find the parent container for better visual highlighting
            var container = element.closest('.column');
            if (container) {
                currentHighlight = container;
            } else {
                currentHighlight = element;
            }
            currentHighlight.classList.add('results-highlight');
            // No auto-scroll - user requested removal
        }
    }

    function selectComponent(component) {
        var data = componentData[component];
        if (!data) return;

        // Update active state on hotspots
        hotspots.forEach(function(hotspot) {
            if (hotspot.dataset.component === component) {
                hotspot.classList.add('active');
            } else {
                hotspot.classList.remove('active');
            }
        });

        // Update explanation card
        explanationTitle.textContent = data.title;
        explanationContent.innerHTML = data.content;
        explanationCard.classList.add('visible');

        currentSelection = component;

        // Highlight corresponding results element
        var hotspot = document.querySelector('.method-hotspot[data-component="' + component + '"]');
        if (hotspot && data.highlightResults) {
            var highlightTarget = hotspot.dataset.highlightResults;
            highlightResultsElement(highlightTarget);
        } else {
            clearHighlight();
        }
    }

    function closeExplanation() {
        explanationCard.classList.remove('visible');
        hotspots.forEach(function(hotspot) {
            hotspot.classList.remove('active');
        });
        currentSelection = null;
        clearHighlight();
    }

    // Add click handlers to hotspots
    hotspots.forEach(function(hotspot) {
        // Add visual indicator for components that highlight results
        if (hotspot.dataset.highlightResults) {
            hotspot.classList.add('can-highlight-results');
        }

        hotspot.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var component = this.dataset.component;
            
            if (currentSelection === component) {
                // Clicking same component closes it
                closeExplanation();
            } else {
                selectComponent(component);
            }
        });
    });

    // Close button handler
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            closeExplanation();
        });
    }

    // Close when clicking outside
    document.addEventListener('click', function(e) {
        if (explanationCard.classList.contains('visible')) {
            if (!explanationCard.contains(e.target) && !e.target.closest('.method-hotspot')) {
                closeExplanation();
            }
        }
    });

    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && explanationCard.classList.contains('visible')) {
            closeExplanation();
        }
    });
}
