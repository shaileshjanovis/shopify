/* layout/theme.liquid */
  $('a[href*="#"]').click(function (event) {

        var href = $(this.hash);

        if (href.length) {
            event.preventDefault();
            $('html, body').animate({
                scrollTop: href.offset().top - 100
            }, 750, function () {

            });
        }
    });
    $(function () {
        $('.scroll').click(function () {
            $(this).parent().addClass('cllicked');
            $(this).parent().siblings().removeClass('cllicked');

        });
    });

 $(document).ready(function () {
        $(document).on('click', 'a.prd_tit', function (e) {
            var productObj = {}
            productObj = JSON.parse(this.getAttribute('data-object'));
            dataLayer.push({ecommerce: null});
            dataLayer.push({
                'event': 'productClick',
                'ecommerce': {
                    'click': {
                        'actionField': {'list': 'Search Results'},
                        'products': [{
                            'name': productObj.name,
                            'id': productObj.id,
                            'price': productObj.price,
                            'brand': productObj.brand,
                            'category': productObj.category,
                            'variant': productObj.variant,
                            'position': productObj.position
                        }]
                    }
                },
                'eventCallback': function () {
                    document.location = productObj.url
                }
            });
        });
        jQuery(document).ready(function () {
            jQuery(".page-map-signup .custom-combobox-input").on("keyup", function () {
                jQuery("#map_canvas").addClass('map-width-active');
                jQuery('.map-panel-1').hide();
            });
        });
        $('.signup-link').click(function () {
            window.location.href = '/account/register';
            return false;
        });
    });
    jQuery(function () {
        jQuery('.swatch :radio').change(function () {
            var optionIndex = jQuery(this).closest('.swatch').attr('data-option-index');
            var optionValue = jQuery(this).val();
            jQuery(this)
                .closest('form')
                .find('.single-option-selector')
                .eq(optionIndex)
                .val(optionValue)
                .trigger('change');
        });
    });
    $('#show-more-content').hide();
    $('#show-more').click(function () {
        $('#show-more-content').show(400);
        $('.product-hero-container .product_desc').css("-webkit-line-clamp", "inherit");
        $('#show-less').show();
        $('#show-more').hide();
    });
    $('#show-less').click(function () {
        $('#show-more-content').hide(300);
        $('.product-hero-container .product_desc').css("-webkit-line-clamp", "2");
        $('#show-more').show();
        $(this).hide();
    });
    $('#show-more-content_circle').hide();
    $('#show-more_circle').click(function () {
        $('#show-more-content_circle').show(400);
        $('#show-less_circle').show();
        $('#show-more_circle').hide();
    });
    $('#show-less_circle').click(function () {
        $('#show-more-content_circle').hide(300);
        $('#show-more_circle').show();
        $(this).hide();
    });
    $(document).ready(function () {
        $('ul.tabs li').click(function () {
            var tab_id = $(this).attr('data-tab');

            $('ul.tabs li').removeClass('current');
            $('.tab-content').removeClass('current');

            $(this).addClass('current');
            $("#" + tab_id).addClass('current');
        })
    });

$('.remove_from_wishlist').click(function () {
        $(this).parents('.col-lg-3').remove();
        $(this).parents('.col-sm-6').remove();
        $(this).parents('.col-xs-6').remove();
    });
    $('.user-mobile-close').click(function () {
        $('.user-icon-popup').toggle();
    });

//  (function () {
//         Wishlist.init();
//     }());
    (function () {
        var REDIRECT_PATH = '/';
        var selector = '#create_customer, form[action$="/account"][method="post"]',
            $form = document.querySelectorAll(selector)[0];
        if ($form) {
            $redirect = document.createElement('input');
            $redirect.setAttribute('name', 'return_to');
            $redirect.setAttribute('type', 'hidden');
            $redirect.value = REDIRECT_PATH;
            $form.appendChild($redirect);
        }
    })();
    $(document).ready(function () {
        $(".phrambtn").click(function () {

            let textr = $('.pickuplocation').text();
            var streetaddress = textr.substr(0, textr.indexOf(','));

            document.getElementById("demo").innerHTML = streetaddress;
        });
    });
    window.onload = function () {
        $(".phrambtn").click();
    }
    $(document).ready(function () {
        $(".surbtn").click(function () {
            if ($(".product_here").find(".gift_product").length > 0) {
                $('.gift_product').parent('.product_here').css("display", "block");
            }
        });
    });
    $(document).ready(function () {
        setTimeout(function () {
            $(".surbtn").trigger('click');

        }, 15000);
        $('.community_banner').last().addClass('last_banner');
    });

/* sections/homepage-block.liquid */
  if (screen.width <= 768) {
    $('.block-single').on('click',function(){
        $(this).children('.block-content').find('.block-text-wrap').toggle();
    });
  }

/* sections/hom-pro-section.liquid */

  $('.wishlist-btn').click(function(){
    if($(this).hasClass('is-active')){
        $(this).removeClass('is-active');
    }else{
        $(this).addClass('is-active');
    };
});

/* snippets/search-drawer.liquid */
$(document).ready(function() {
      var language = $('html').attr('lang');
      var items = "";
    
      if(language == 'el'){
        var noFoundMsg = "Δεν βρέθηκαν προϊόντα";
        var srText = "αποτελέσματα";
      } else {
        var noFoundMsg = "No Product Found";
        var srText = "Results";
      }
    
      $('.search-bar_input').focus(function () {
        if( $(this).val() == '' ) {
          $('.most-popular-main').show();
          $('header .search_form_container .predictive-search').css("display", "none");
        }
      });
      
      $( ".search-container--desktop" ).mouseleave(function( event ) {
        $('.most-popular-main').hide();
        $('header .search_form_container .predictive-search').css("display", "block");
      });
  
      $('.search-bar_input').on("input",function (e)  {  
        var totalLenght =  $(this).val();
        $(".most-popular-main").hide();
        
        if( $(this).val() == '' ) {
          $('.most-popular-main').show();
          $('header .search_form_container .predictive-search').css("display", "none");
        } else {
          $('.most-popular-main').hide();
          $('header .search_form_container .predictive-search').css("display", "block");
        }
        
        if(totalLenght.length > 0){
          if(totalLenght == '' || totalLenght == ' '){
            $('.search-container--desktop .results-count').hide();
          }else{
            $('.search-container--desktop .results-count').show();
          }
        }
       
        if(totalLenght.length > 2){
            $(".predictive-search-wrapper").show();
            $(".search-btn").prop("disabled", false);
            
            var url = "https://api.korresfamily.com/api/v1/MarketplaceItem/GetSearchProductnamebyshopify";
            $.ajax({
              url: url,
              type: 'POST',
              data:{lang: language, query: totalLenght,page_no: 1,page_size: 12},
              success:function(res){
                setTimeout(function(){
                  if(res.total > 0){
                    $(".predictive-search__list").empty();
                    var recCount = 0;
                    //$(".predictive-search-title__content").text(res.total+" "+srText);
                    
                    $.each(res.results, function(key, value){
                      var proName = res.results[key].product_name;
                      var recCount = proName.length;
                      
                      if(language == 'el'){
                          var proHandle = "/el/products/"+res.results[key].handle;
                      } else {
                          var proHandle = "/products/"+res.results[key].handle;
                      }

                      var items = '<li id="search-result-0" class="predictive-search-item" role="option"> <a class="predictive-search-item__link" href="'+proHandle+'" tabindex="-1">'+proName+'</a></li>';
                      $(".predictive-search__list").append(items);
                    });
                  } else {
                    $(".predictive-search__list").empty();                    
                    var items = '<li id="search-result-0" class="predictive-search-item" role="option"> <a class="predictive-search-item__link" href="#" tabindex="-1">'+noFoundMsg+'</a></li>';
                    $(".predictive-search__list").append(items);
                  }
                },1500);
              },
              error: function (error) {
                alert('error');
              }
            });  
        } else if(totalLenght.length < 1) {
            $(".predictive-search-wrapper").hide();
            $(".search-btn").prop("disabled", true);
        }
     });
    
  });

/* template/collection.liquid */
    var tabLinks = document.querySelectorAll(".tablinks");
    var tabContent = document.querySelectorAll(".tabcontent");
    tabLinks.forEach(function (el) {
        el.addEventListener("click", openTabs);
    });

    function openTabs(el) {
        var btnTarget = el.currentTarget;
        var country = btnTarget.dataset.country;
        tabContent.forEach(function (el) {
            el.classList.remove("active");
        });

        tabLinks.forEach(function (el) {
            el.classList.remove("active");
        });
        document.querySelector("#" + country).classList.add("active");
        btnTarget.classList.add("active");
    }
    function openNav() {
        document.getElementById("myNav").style.display = "block";
    }

    function closeNav() {
        document.getElementById("myNav").style.display = "none";
    }

    $('.l1').on('click', function () {
        var tag = $(this).attr('value');
        var tag1 = $(this).text();
        var back_link = "#layer" + tag;
        $('.nav-link').attr('href', back_link);
        $('.nav-link').attr('value', tag);
        $("#layer" + tag).removeClass('hide-menu');
        $("#layer" + tag).toggleClass('show-menu');
    });
    $('.nav-link').on('click', function () {
        var tag = $(this).attr('href');
        var val = $(this).attr('value');
        $(tag).removeClass('show-menu');
        var back_link = "#layer" + (val - 1);
        $('.nav-link').attr('href', back_link);
        $('.nav-link').attr('value', val - 1);

    });

    $(document).on('click', '.add-to-cart', function (e) {
        var product_id = $(this).data('id');

        var User_Id = $('body').attr('data-original');

        $.ajax({
            url: "https://api.korresfamily.com/api/v1/MarketplaceItem/AddItemCartbyshopify?product_id=" + product_id + "&User_id=" + User_Id + "&qty=1",
            type: 'GET',
            success: function (res) {
                console.log(res);
            },
            error: function (error) {
                console.log(error);
            }
        });
    });

/* snippets/spin-section.liquid */
  $(document).on('click', '.l-click', function() {
    var show = $(this).data('show');
    $(this).parent().parent().removeClass().addClass('arc-containe '+show);
    $(this).parent().addClass('active');
    $(show).removeClass("hide").siblings().addClass("hide");
  });

$(document).ready(function () {
    if($(window).width() < 768) {
        $(".nested_mobile_nav").addClass('hidden'); 
    }
});