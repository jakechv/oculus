// main popup function
$(function() {
  Grid.init();
});

var $event = $.event,
$special,
resizeTimeout;

$special = $event.special.debouncedresize = {
  setup: function() {
    $( this ).on( "resize", $special.handler );
  },
  teardown: function() {
    $( this ).off( "resize", $special.handler );
  },
  handler: function( event, execAsap ) {
    var context = this,
      args = arguments,
      dispatch = function() {
        event.type = "debouncedresize";
        $event.dispatch.apply( context, args );
      };

    if ( resizeTimeout ) {
      clearTimeout( resizeTimeout );
    }

    execAsap ?
      dispatch() :
      resizeTimeout = setTimeout( dispatch, $special.threshold );
  },
  threshold: 250
};

var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

$.fn.imagesLoaded = function( callback ) {
  var $this = this,
    deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
    hasNotify = $.isFunction(deferred.notify),
    $images = $this.find('img').add( $this.filter('img') ),
    loaded = [],
    proper = [],
    broken = [];

  if ($.isPlainObject(callback)) {
    $.each(callback, function (key, value) {
      if (key === 'callback') {
        callback = value;
      } else if (deferred) {
        deferred[key](value);
      }
    });
  }

  function doneLoading() {
    var $proper = $(proper),
      $broken = $(broken);

    if ( deferred ) {
      if ( broken.length ) {
        deferred.reject( $images, $proper, $broken );
      } else {
        deferred.resolve( $images );
      }
    }

    if ( $.isFunction( callback ) ) {
      callback.call( $this, $images, $proper, $broken );
    }
  }

  function imgLoaded( img, isBroken ) {
    if ( img.src === BLANK || $.inArray( img, loaded ) !== -1 ) {
      return;
    }

    loaded.push( img );

    if ( isBroken ) {
      broken.push( img );
    } else {
      proper.push( img );
    }

    $.data( img, 'imagesLoaded', { isBroken: isBroken, src: img.src } );

    if ( hasNotify ) {
      deferred.notifyWith( $(img), [ isBroken, $images, $(proper), $(broken) ] );
    }

    if ( $images.length === loaded.length ){
      setTimeout( doneLoading );
      $images.unbind( '.imagesLoaded' );
    }
  }

  if ( !$images.length ) {
    doneLoading();
  } else {
    $images.bind( 'load.imagesLoaded error.imagesLoaded', function( event ){
      imgLoaded( event.target, event.type === 'error' );
    }).each( function( i, el ) {
      var src = el.src;

      var cached = $.data( el, 'imagesLoaded' );
      if ( cached && cached.src === src ) {
        imgLoaded( el, cached.isBroken );
        return;
      }

      if ( el.complete && el.naturalWidth !== undefined ) {
        imgLoaded( el, el.naturalWidth === 0 || el.naturalHeight === 0 );
        return;
      }

      if ( el.readyState || el.complete ) {
        el.src = BLANK;
        el.src = src;
      }
    });
  }

  return deferred ? deferred.promise( $this ) : $this;
};

var Grid = (function() {

  var $grid = $( '*#og-grid' ),
    $items = $grid.children( 'li' ),
    current = -1,
    previewPos = -1,
    scrollExtra = 0,
    marginExpanded = 10,
    $window = $( window ), winsize,
    $body = $( 'html, body' ),
    transEndEventNames = {
      'WebkitTransition' : 'webkitTransitionEnd',
      'MozTransition' : 'transitionend',
      'OTransition' : 'oTransitionEnd',
      'msTransition' : 'MSTransitionEnd',
      'transition' : 'transitionend'
    },
    transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
    support = Modernizr.csstransitions,
    settings = {
      minHeight : 500,
      speed : 350,
      easing : 'ease'
    };

  function updateList() {
    $items = $grid.children( 'li' );
    saveItemInfo(true);
  }
  
  function init( config ) {
    
    settings = $.extend( true, {}, settings, config );

    $grid.imagesLoaded( function() {

      saveItemInfo( true );
      getWinSize();
      initEvents();

    } );

  }

  function addItems( $newitems ) {

    $items = $items.add( $newitems );

    $newitems.each( function() {
      var $item = $( this );
      $item.data( {
        offsetTop : $item.offset().top,
        height : $item.height()
      } );
    } );

    initItemsEvents( $newitems );

  }

  function saveItemInfo( saveheight ) {
    $items.each( function() {
      var $item = $( this );
      $item.data( 'offsetTop', $item.offset().top );
      if( saveheight ) {
        $item.data( 'height', $item.height() );
      }
    } );
  }

  function initEvents() {
    
    initItemsEvents( $items );
    
    $window.on( 'debouncedresize', function() {
      
      scrollExtra = 0;
      previewPos = -1;
      saveItemInfo();
      getWinSize();
      var preview = $.data( this, 'preview' );
      if( typeof preview != 'undefined' ) {
        hidePreview();
      }

    } );

  }

  function initItemsEvents( $items ) {
    $items.on( 'click', 'span.og-close', function() {
      hidePreview();
      return false;
    } ).children( 'a' ).on( 'click', function(e) {

      var $item = $( this ).parent();
      current === Array.from($items).findIndex(d => d == $item[0]) ? hidePreview() : showPreview( $item );
      return false;

    } );
  }

  function getWinSize() {
    winsize = { width : $window.width(), height : $window.height() };
  }

  function showPreview( $item ) {

    var preview = $.data( this, 'preview' ),
      position = $item.data( 'offsetTop' );

    scrollExtra = 0;

    if( typeof preview != 'undefined' ) {

      if( previewPos !== position ) {
        if( position > previewPos ) {
          scrollExtra = preview.height;
        }
        hidePreview();
      }
      else {
        preview.update( $item );
        return false;
      }
      
    }

    previewPos = position;
    preview = $.data( this, 'preview', new Preview( $item ) );
    preview.open();

  }

  function hidePreview() {
    current = -1;
    var preview = $.data( this, 'preview' );
    preview.close();
    $.removeData( this, 'preview' );
  }

  function Preview( $item ) {
    this.$item = $item;
    this.expandedIdx = Array.from($items).findIndex(d => d == this.$item[0]);
    this.create();
    this.update();
  }

  Preview.prototype = {
    create : function() {
      this.$title = $( '<h3></h3>' );
      this.$description = $( '<p></p>' );
      this.$href = $( '<a href="#" target="_blank"></a>' );
      this.$exifInfo = $( '<ul class="exif"></ul>' );
      this.$collectionName = $( '<div class="stamp"></div>' );
      this.$details = $( '<div class="og-details"></div>' ).append( this.$collectionName, this.$title, this.$description, this.$exifInfo, this.$href);
      this.$loading = $( '<div class="og-loading"></div>' );
      this.$fullimage = $( '<div class="og-fullimg"></div>' ).append( this.$loading );
      this.$closePreview = $( '<span class="og-close"></span>' );
      this.$previewInner = $( '<div class="og-expander-inner"></div>' ).append( this.$closePreview, this.$fullimage, this.$details );
      this.$previewEl = $( '<div class="og-expander"></div>' ).append( this.$previewInner );
      this.$item.append( this.getEl() );
      if( support ) {
        this.setTransition();
      }
    },
    update : function( $item ) {

      if( $item ) {
        this.$item = $item;
      }
      
      if( current !== -1 ) {
        var $currentItem = $items.eq( current );
        $currentItem.removeClass( 'og-expanded' );
        this.$item.addClass( 'og-expanded' );
        this.positionPreview();
      }

      current = this.$item.index();

      var $itemEl = this.$item.children( 'a' ),
        eldata = {
          href : $itemEl.attr( 'href' ),
          largesrc : $itemEl.data( 'largesrc' ),
          title : $itemEl.data( 'title' ),
          description : $itemEl.data( 'description' ),
          exif : $itemEl.data( 'exif' ),
          buttontext : $itemEl.data( 'buttontext' ),
          collectionName : $itemEl.data( 'collection' )
        };

      this.$title.html( eldata.title );
      this.$description.html( eldata.description );
      if(eldata.exif) {
        this.$exifInfo.html( eldata.exif );
        this.$exifInfo.show();
      } else this.$exifInfo.hide(); 
      if(eldata.collectionName) {
        this.$collectionName.html( eldata.collectionName );
        this.$collectionName.show();
      } else this.$collectionName.hide();
      if(eldata.buttontext) this.$href.text(eldata.buttontext);

      if (eldata.href && eldata.buttontext) {
        this.$href.attr( 'href', eldata.href );
        this.$href.show();
      }
      else {
        this.$href.hide();
      }

      var self = this;
      
      if( typeof self.$largeImg != 'undefined' ) {
        self.$largeImg.remove();
      }

      if( self.$fullimage.is( ':visible' ) ) {
        this.$loading.show();
        $( '<img/>' ).load( function() {
          var $img = $( this );
          if( $img.attr( 'src' ) === self.$item.children('a').data( 'largesrc' ) ) {
            self.$loading.hide();
            self.$fullimage.find( 'img' ).remove();
            self.$largeImg = $img.fadeIn( 350 );
            self.$fullimage.append( self.$largeImg );
          }
        } ).attr( 'src', eldata.largesrc );
      }

    },
    open : function() {

      setTimeout( $.proxy( function() {	
        this.setHeights();
        this.positionPreview();
      }, this ), 25 );

    },
    close : function() {

      var self = this,
        onEndFn = function() {
          if( support ) {
            $( this ).off( transEndEventName );
          }
          self.$item.removeClass( 'og-expanded' );
          self.$previewEl.remove();
        };

      setTimeout( $.proxy( function() {

        if( typeof this.$largeImg !== 'undefined' ) {
          this.$largeImg.fadeOut( 'fast' );
        }
        this.$previewEl.css( 'height', 0 );
        var $expandedItem = $items.eq( this.expandedIdx );
        $expandedItem.css( 'height', $expandedItem.data( 'height' ) ).on( transEndEventName, onEndFn );

        if( !support ) {
          onEndFn.call();
        }

      }, this ), 25 );
      
      return false;

    },
    calcHeight : function() {

      var heightPreview = winsize.height - this.$item.data( 'height' ) - marginExpanded,
        itemHeight = winsize.height;

      if( heightPreview < settings.minHeight ) {
        heightPreview = settings.minHeight;
        itemHeight = settings.minHeight + this.$item.data( 'height' ) + marginExpanded;
      }

      this.height = heightPreview;
      this.itemHeight = itemHeight;

    },
    setHeights : function() {

      var self = this,
        onEndFn = function() {
          if( support ) {
            self.$item.off( transEndEventName );
          }
          self.$item.addClass( 'og-expanded' );
        };

      this.calcHeight();
      this.$previewEl.css( 'height', this.height );
      this.$item.css( 'height', this.itemHeight ).on( transEndEventName, onEndFn );

      if( !support ) {
        onEndFn.call();
      }

    },
    positionPreview : function() {

      var position = this.$item.data( 'offsetTop' ),
        previewOffsetT = this.$previewEl.offset().top - scrollExtra,
        scrollVal = this.height + this.$item.data( 'height' ) + marginExpanded <= winsize.height ? position : this.height < winsize.height ? previewOffsetT - ( winsize.height - this.height ) : previewOffsetT;
      
      $body.animate( { scrollTop : scrollVal }, settings.speed );

    },
    setTransition  : function() {
      this.$previewEl.css( 'transition', 'height ' + settings.speed + 'ms ' + settings.easing );
      this.$item.css( 'transition', 'height ' + settings.speed + 'ms ' + settings.easing );
    },
    getEl : function() {
      return this.$previewEl;
    }
  }

  return { 
    init : init,
    addItems : addItems,
    updateList: updateList
  };

})();

// lazy loading thumbnails
document.addEventListener("DOMContentLoaded", function() {
  var lazyloadImages= document.querySelectorAll("img.lazy");    

  if ("IntersectionObserver" in window) {
    var imageObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var image = entry.target;
          $(image).load(function(){
            image.classList.remove("lazy");
            image.style.removeProperty("width");
          }).attr('src', image.dataset.src);
          imageObserver.unobserve(image);
        }
      });
    });

    lazyloadImages.forEach(function(image) {
      imageObserver.observe(image);
    });
  } else {// original code has some issue. Disable lazy loading for now
    lazyloadImages.forEach(function(img) {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      img.style.removeProperty("width");
    });
  }
})