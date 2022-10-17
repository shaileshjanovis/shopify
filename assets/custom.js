const observer = lozad(); 
observer.observe();
$('.home_carousel').slick({
  infinite: true,
  slidesToShow: 4,
  slidesToScroll: 4,

  //centerMode: true,
  responsive: [
    {
      breakpoint: 992,
      settings: {
        slidesToShow: 3,
        slidesToScroll: 3,
      }
    },

    {
      breakpoint: 480,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 2,
        arrows: false
      }
    }
  ]
});

jQuery('.carousel-custom .arrow').click(function() {
    var slideContainerEl = jQuery(this).parents('.carousel-custom').find('.slide-container');
    var slideEl = jQuery(this).parents('.carousel-custom').find('.slide');
    var slideWidth = slideEl.width();
    jQuery(window).on("resize", function(){
      slideWidth = slideEl.width();
    });
    var maxScrollLeft = slideContainerEl[0].scrollWidth - slideContainerEl.width();
    var position = 0;
    var width = 0;
    var arg = jQuery(this).data("arrow");
    if (arg === "forward") {
        width = slideContainerEl.scrollLeft() + parseInt(slideWidth) + 10 ;
        position = width <= maxScrollLeft ? width : 0;
    } else if (arg === "backward") {
        width = slideContainerEl.scrollLeft() - parseInt(slideWidth) + 10;
        position = width >= 0 ? width : maxScrollLeft;
    }
    slideContainerEl.scrollLeft(position);
 });

jQuery(".carousel-custom .slide-indicator").click(function() {
  	jQuery(".slide-indicator").removeClass('active');
  	jQuery(this).addClass('active');
    var slideIndex = jQuery(this).data("slideindex");
  	var slideContainerEl = jQuery(this).parents('.carousel-custom').find('.slide-container');
    var slideEl = jQuery(this).parents('.carousel-custom').find('.slide');
  	var slideWidth = slideEl.width();
    jQuery(window).on("resize", function(){
      slideWidth = slideEl.width();
    });
  	var position = slideIndex * (slideWidth + 10);
  	slideContainerEl.scrollLeft(position);
});

var down =0;
var up =0;
$(".move-slide").mousedown(function(event){
  down = parseInt(event.pageX);
  event.preventDefault();
});
$(".move-slide").mouseup(function(event){
  console.log("Aaaaa");
  var slideContainerEl = jQuery(this).parents('.carousel-custom').find('.slide-container');
  var slideEl = jQuery(this).parents('.carousel-custom').find('.slide');
  var slideWidth = slideEl.width();
  jQuery(window).on("resize", function(){
    slideWidth = slideEl.width();
  });
  var maxScrollLeft = slideContainerEl[0].scrollWidth - slideContainerEl.width();
  var position = 0;
  var width = 0;
  up = parseInt(event.pageX);
  if(down > up) {
    width = slideContainerEl.scrollLeft() + parseInt(slideWidth);
    position = width <= maxScrollLeft ? width : 0;
    slideContainerEl.scrollLeft(position);
  }
  if(down < up) {
    width = slideContainerEl.scrollLeft() - parseInt(slideWidth);
    position = width >= 0 ? width : maxScrollLeft;
    slideContainerEl.scrollLeft(position);
  }
});

$(".slide-container").on("scroll",function(){ 
	var position = $(this).scrollLeft() / $(this).width();
	$(".slide-indicator").removeClass('active');
	$('*[data-slideindex="'+ position.toFixed() +'"]').addClass("active")
});

var Ajaxinate = function (e) {
  var i = e || {},
      n = { pagination: ".AjaxinatePagination",
           method: "scroll", 
           container: ".AjaxinateLoop", 
           offset: 0, 
           callback: null };
  (this.settings = Object.assign(n, i)),
    (this.addScrollListeners = this.addScrollListeners.bind(this)),
    (this.addClickListener = this.addClickListener.bind(this)),
    (this.checkIfPaginationInView = this.checkIfPaginationInView.bind(this)),
    (this.stopMultipleClicks = this.stopMultipleClicks.bind(this)),
    (this.containerElement = document.querySelector(this.settings.container)),
    (this.paginationElement = document.querySelector(this.settings.pagination)),
    this.initialize();
};
(Ajaxinate.prototype.initialize = function () {
  if (this.containerElement) {
    var e = { click: this.addClickListener, scroll: this.addScrollListeners };
    e[this.settings.method]();
    const observer = lozad();
    observer.observe();
  }
}),
  (Ajaxinate.prototype.addScrollListeners = function () {
  this.paginationElement &&
    (document.addEventListener("scroll", this.checkIfPaginationInView), 
     window.addEventListener("resize", this.checkIfPaginationInView), 
     window.addEventListener("orientationchange", this.checkIfPaginationInView));
}),
  (Ajaxinate.prototype.addClickListener = function () {
  this.paginationElement &&
    ((this.nextPageLinkElement = this.paginationElement.querySelector("a")), (this.clickActive = !0), 
     this.nextPageLinkElement !== null && this.nextPageLinkElement.addEventListener("click", this.stopMultipleClicks));
}),
  (Ajaxinate.prototype.stopMultipleClicks = function (e) {
  e.preventDefault(), this.clickActive && ((this.nextPageLinkElement.innerHTML = this.settings.loadingText), 
                                           (this.nextPageUrl = this.nextPageLinkElement.href), (this.clickActive = !1), this.loadMore());
}),
  (Ajaxinate.prototype.checkIfPaginationInView = function () {
  var e = this.paginationElement.getBoundingClientRect().top - this.settings.offset,
      i = this.paginationElement.getBoundingClientRect().bottom + this.settings.offset;
  e <= window.innerHeight &&
    i >= 0 &&
    ((this.nextPageLinkElement = this.paginationElement.querySelector("a")),
     this.removeScrollListener(),
     this.nextPageLinkElement && ((this.nextPageLinkElement.innerHTML = this.settings.loadingText), 
                                  (this.nextPageUrl = this.nextPageLinkElement.href), this.loadMore()));
}),
  (Ajaxinate.prototype.loadMore = function () {
  (this.request = new XMLHttpRequest()),
    (this.request.onreadystatechange = function () {
    if (this.request.readyState === 4 && this.request.status === 200) {
      var i = this.request.responseXML.querySelectorAll(this.settings.container)[0],
          n = this.request.responseXML.querySelectorAll(this.settings.pagination)[0];
      this.containerElement.insertAdjacentHTML("beforeend", i.innerHTML),
        (this.paginationElement.innerHTML = n.innerHTML),
        this.settings.callback && typeof this.settings.callback == "function" && this.settings.callback(this.request.responseXML),
        this.initialize();
    }
  }.bind(this)),
    this.request.open("GET", this.nextPageUrl),
    (this.request.responseType = "document"),
    this.request.send();
}),
  (Ajaxinate.prototype.removeClickListener = function () {
  this.nextPageLinkElement.addEventListener("click", this.stopMultipleClicks);
}),
  (Ajaxinate.prototype.removeScrollListener = function () {
  document.removeEventListener("scroll", this.checkIfPaginationInView), 
    window.removeEventListener("resize", this.checkIfPaginationInView),
    window.removeEventListener("orientationchange", this.checkIfPaginationInView);
});

function callbackInfiniteScroll(){}
document.addEventListener("DOMContentLoaded", function() {
  var endlessScroll = new Ajaxinate({
    container: '#Custom-Loop',
    pagination: '#Custom-Pagination',
    loadingText: '',
    callback: callbackInfiniteScroll
  });
});