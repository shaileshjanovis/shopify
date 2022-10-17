var cookieName = "wishlistList";
var initWishlist= function() {
  updateWishlistButtons();
  initWishlistButtons();
}

var initWishlistButtons= function() {
  if($(".add-in-wishlist-js").length == 0) {        
    return false;
  }
  $(".add-in-wishlist-js").each(function(){
    $(this).unbind();
    $(this).click(function(event){
      event.preventDefault();
      try
      {
        var id = $(this).attr('href');
        if(id.indexOf('el/') > -1){
          id = $(this).attr('href');  
          id = id.replace('/el/','');
        }
        if(Cookies.get(cookieName) == null) {
          var str = id;
        } else {
          if(Cookies.get(cookieName).indexOf(id) == -1) {
            var str = Cookies.get(cookieName) + '__' + id;
          }
        }
        Cookies.set(cookieName, str, {expires:14, path:'/'});
        jQuery('.loadding-wishbutton-'+id).show();
        jQuery('.default-wishbutton-'+id).remove();
        setTimeout(function(){ jQuery('.loadding-wishbutton-'+id).remove(); jQuery('.added-wishbutton-'+id).show(); }, 2000);
        $(this).unbind();
      }
      catch (err) {
        console.log("err.message=", err.message);
      } // ignore errors reading cookies
    })
  });
}

var updateWishlistButtons= function() {
  try
  {
    if(Cookies.get(cookieName) != null && Cookies.get(cookieName) != '__' && Cookies.get(cookieName) != '') {   
      var str = String(Cookies.get(cookieName)).split("__");
      for (var i=0; i<str.length; i++) {
        if (str[i] != '') {
          jQuery('.added-wishbutton-'+str[i]).show();
          jQuery('.default-wishbutton-'+str[i]).remove();
          jQuery('.loadding-wishbutton-'+str[i]).remove();
        }
      }
    }
  }
  catch (err) {}
}

var showModal= function(n) {
  e(n).fadeIn(500);
  t.KidsTimeout = setTimeout(function() {
    e(n).fadeOut(500)
  }, 5e3)
}

$(document).ready(function() {
  initWishlist();  
});



