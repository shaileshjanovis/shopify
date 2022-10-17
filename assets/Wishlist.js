(function (Wishlist, $) {

  var $wishlistButton = $('.wishlist-btn');
  var $wishlistTile = $('.wishlist-tile-container');
  var $wishlistItemCount = $('.wishlist-item-count');
  var $wishproduct = $('.wishlist-box');
  var numProductTiles = $wishlistTile.length;
  var wishlist = localStorage.getItem('user_wishlist') || [];
  if (wishlist.length > 0) {
    wishlist = JSON.parse(localStorage.getItem('user_wishlist'));
  }
  var customerActive = $('body').attr('data-original');
  
  if (typeof customerActive !== 'undefined' && customerActive !== false) {
    if (wishlist.length > 0) {
      	wishlist = JSON.parse(localStorage.getItem('user_wishlist'));
      	console.log('loginfst');
    	console.log(wishlist.length);
      	var url = "https://api.korresfamily.com/api/v1/MarketplaceItem/AddProductinwishlist?product_id="+wishlist+"&User_id="+customerActive;
        
      	$.ajax({
          url: url,
          type: 'GET',
          success:function(res){
            var strarray = res.split(',');
            
            wishlist.splice(0, wishlist.length);
            localStorage.setItem('user_wishlist', JSON.stringify(wishlist));
            
            for (var i = 0; i < strarray.length; i++) {
              	if (wishlist.indexOf(strarray[i]) < 0) {
                  wishlist.push(strarray[i]);
                  localStorage.setItem('user_wishlist', JSON.stringify(wishlist));
                  $('div[data-product-handle='+strarray[i]+']').addClass('is-active');
                }
            }
          },
          	error: function (error) {
            console.log(error);
          }
        });
    } else {
      	console.log('loginsec');
    	console.log(wishlist.length);
      	var url = "https://api.korresfamily.com/api/v1/MarketplaceItem/AddProductinwishlist?product_id=null&User_id="+customerActive;
        $.ajax({
            url: url,
            type: 'GET',
            success:function(res){
              if(res !== null){
                wishlist.splice(0, wishlist.length);
                localStorage.setItem('user_wishlist', JSON.stringify(wishlist));
                
                var strarray = res.split(',');
                for (var i = 0; i < strarray.length; i++) {
                     wishlist.push(strarray[i]);
                     localStorage.setItem('user_wishlist', JSON.stringify(wishlist));
                     $('div[data-product-handle='+strarray[i]+']').addClass('is-active');
                }  
              }
            },
            error: function (error) {
              console.log(error);
            }
          });
    }
  }

  /*
   * Update button to show current state (gold for active)
   */   
//   var animateWishlist = function (self) {
//     $(self).toggleClass('is-active');
//   };

  /*
   * Add/Remove selected item to the user's wishlist array in localStorage
   * Wishlist button class 'is-active' determines whether or not to add or remove
   * If 'is-active', remove the item, otherwise add it
   */   
  var updateWishlist = function (self) {
    var productHandle = $(self).attr('data-product-handle');
    var isRemove = $(self).hasClass('is-active');
    /* Remove */
    if (isRemove) {
      var removeIndex = wishlist.indexOf(productHandle);
      wishlist.splice(removeIndex, 1);
      localStorage.setItem('user_wishlist', JSON.stringify(wishlist));
      
      if (typeof customerActive !== 'undefined' && customerActive !== false) {
        var url = "https://api.korresfamily.com/api/v1/MarketplaceItem/DeleteWishlistProductShopify?product_id="+productHandle+"&User_id="+customerActive;
        $.ajax({
          url: url,
          type: 'GET',
          success:function(res){
            console.log(res);
          },
          error: function (error) {
            console.log(error);
          }
        });
      }
    }
    /* Add */ 
    else {
      wishlist.push(productHandle);
      localStorage.setItem('user_wishlist', JSON.stringify(wishlist));
      /************ Send data to uatroollapi ***********/
      if (typeof customerActive !== 'undefined' && customerActive !== false) {
        var url = "https://api.korresfamily.com/api/v1/MarketplaceItem/AddProductinwishlist?product_id="+productHandle+"&User_id="+customerActive;
        $.ajax({
          url: url,
          type: 'GET',
          success:function(res){
            console.log(res);
          },
          error: function (error) {
            console.log(error);
          }
        });
      }
    }
    console.log(wishlist.length)
    if(wishlist.length == 0){
      $('.wishlist-grid--empty-list').addClass('is_visible');
      $('.wishlist-empty-content').show();
      $('.wishlist-grid--empty-list').show();
    }else{
      $('.wishlist-grid--empty-list').removeClass('is_visible');
      $('.wishlist-empty-content').hide();
      $('.wishlist-grid--empty-list').hide();
    }
    console.log(JSON.stringify(wishlist));
  };

  /*
   * Loop through wishlist buttons and activate any items that are already in user's wishlist
   * Activate by adding class 'is-active'
   * Run on initialization
   */   
  var activateItemsInWishlist = function () {
    $wishlistButton.each(function () {
      var productHandle = $(this).attr('data-product-handle');
      if (wishlist.indexOf(productHandle) > -1) {
        $(this).addClass('is-active');
      }
    });
  };

  /*
   * Loop through product titles and remove any that aren't a part of the wishlist
   * Decrement numProductTiles on removal
   */   
  var displayOnlyWishlistItems = function () {
    $wishlistTile.each(function () {
      var productHandle = $(this).attr('data-product-handle');
      if (wishlist.indexOf(productHandle) === -1) {
        $(this).remove();
        numProductTiles--;
      }
    });
  };

  /*
   * Check if on the wishlist page and hide any items that aren't a part of the wishlist
   * If no wishlist items exist, show the empty wishlist notice
   */   
  var loadWishlist = function () {
    if (window.location.href.indexOf('pages/wishlist') > -1) {
      displayOnlyWishlistItems();
      setTimeout(function(){
        $('.wishlist-loader').fadeOut(2000, function () {
          $('.wishlist-box').show();
          $('.wishlist-grid').addClass('is_visible');
          $('.wishlist-hero').addClass('is_visible');
          if (numProductTiles == 0) {
            $('.wishlist-grid--empty-list').addClass('is_visible');
            $('.wishlist-empty-content').show();
          } else {
            $('.wishlist-grid--empty-list').hide();
          }

      console.log(pharmacy_id+' pharmacy_id ')
      $('.product-tile-container').each(function(e){
        var product_id = $(this).find('.wish_page').val();
        console.log('product id '+product_id)
        var current = $(this);
        $.ajax({
          type: 'GET', 
          url: 'https://api.korresfamily.com/api/v1/MarketplaceItem/GetproductPricelist?productid='+product_id+'&pharmecyid='+pharmacy_id,
          dataType: 'json', 
          success: function(data){
            var cprice = data.data.price;
            cprice = cprice.toString().replace('.',',');
            console.log(cprice);
            current.find(".product-price").html('€'+cprice);
            current.find(".product-price, p.price").attr('data-customprice',data.data.price);
          },
          error:function(error){
            console.log(error);
          }
        });
      })
          
          
        });
      },3000);
      
    }
  };

  /**
   * Display number of items in the wishlist
   * Must set the $wishlistItemCount variable
   */
  var updateWishlistItemCount = function () {
    if (wishlist) {
      $wishlistItemCount.text(wishlist.length);
    }
  };

  var bindUIActions = function () {
    $wishlistButton.click(function (e) {
      e.preventDefault();
      updateWishlist(this);
      //animateWishlist(this);
    });
  };

  Wishlist.init = function () {
    bindUIActions();
    activateItemsInWishlist();
    loadWishlist();
    updateWishlistItemCount();
  };

}(window.Wishlist = window.Wishlist || {}, jQuery, undefined));