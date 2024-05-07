src="https://code.jquery.com/jquery-3.6.0.min.js">

$(document).ready(function() {
  // Retrieve the cuisine data from your backend for filters
  var prev = '';
  var $hiddenCards = $();
  var $filters = ["","",""];
    function updateCards($cards,$filters){
        $cards.each(function() {
            var showCard = true;
            var $attributes = [];
            $attributes.push($(this).find('.hover-box ').text().trim());
            $attributes.push($(this).find('.price ').text().trim());
            $attributes.push($(this).find('.rating ').text().trim());
            for (var i = 0; i < $filters.length; i++) {
                if ($attributes[i] !== $filters[i] && $filters[i] != "") {
                    if(i==2){
                        if($attributes[i]<$filters[i]){
                            showCard = false;
                            break; //
                        }
                    }
                    else{
                        showCard = false;
                        break; // Exit the loop early if a mismatch is found
                    }
                }
            }

            if (showCard) {
                $(this).show();
            } else {
                $(this).hide();
            }
        }
        ); 
    }
    function filterCardsByCuisine(selectedCuisine,hi) {
        var $restaurantsContainer = $('#restaurants');
        var $cards = $restaurantsContainer.find('.card-res ');
        var $cusines = $restaurantsContainer.find('.hover-box ');
        if ($filters[0] == selectedCuisine){
            $filters[0] = "";
            $(hi).prop('checked', false);
        }
        else if($filters.length >= 1){
            $filters[0] = selectedCuisine;
        }
        else{
            $filters.push(selectedCuisine);
        }
        
        if($filters.length == 0){
            $filters.push("");
        }
        updateCards($cards,$filters);
    };

    function filterCardsByPrice(selectedPrice,hi) {
        var $restaurantsContainer = $('#restaurants');
        var $cards = $restaurantsContainer.find('.card-res ');
        if ($filters[1] == selectedPrice){
            $filters[1] = "";
            
        }
        else if($filters.length >= 2){
            $filters[1] = selectedPrice;
        }
        else{
            $filters.splice(1, 0, selectedPrice);
        }
        if($filters.length == 0){
            $filters.push("");
        }
        updateCards($cards,$filters);
       
    };       
    function filterCardsByPrice(selectedPrice,hi) {
        var $restaurantsContainer = $('#restaurants');
        var $cards = $restaurantsContainer.find('.card-res ');
        if ($filters[1] == selectedPrice){
            $filters[1] = "";
            $(hi).prop('checked', false);
        }
        else if($filters.length >= 2){
            $filters[1] = selectedPrice;
        }
        else{
            $filters.splice(1, 0, selectedPrice);
        }
        if($filters.length == 0){
            $filters.push("");
        }
        updateCards($cards,$filters);
       
    }; 
    function filterCardsByRating(selectedRating,hi) {
        var $restaurantsContainer = $('#restaurants');
        var $cards = $restaurantsContainer.find('.card-res ');
        if ($filters[2] == selectedRating){
            $filters[2] = "";
            $(hi).prop('checked', false);
        }
        else if($filters.length >= 3){
            $filters[2] = selectedRating;
        }
        else{   
            $filters.splice(2, 0, selectedRating);
        }
        if($filters.length == 0){
            $filters.push("");
        }
        updateCards($cards,$filters);
       
    };

    function selectionfilter(button,prev){
        if(prev != null){
            if(prev == button){
               
                button.toggleClass('selected');
                prev = null;
            }
            else{
                prev.toggleClass('selected');
                prev = button;
                // Toggle the 'selected' class on the button element
                button.toggleClass('selected');
            }
            
        }
        else{
            prev = button;
            // Toggle the 'selected' class on the button element
            button.toggleClass('selected');
        }
        return prev;
    }
    var prevPrice = null;
    var prevRating = null;
    temp = null;
  $('.btn-check').on( "click", function() {
        var selectedCuisine = $(this).val();
        if(selectedCuisine == 2.9 || selectedCuisine== 4.0 || selectedCuisine==5){
            const buttonId = $(this).attr('id'); // Get the ID of the clicked radio input
            const button = $(`label[for='${buttonId}']`); // Find the corresponding label by ID
            prevRating = selectionfilter(button,prevRating);
            filterCardsByRating(selectedCuisine,this);
            
        }
        else if(selectedCuisine == 1 || selectedCuisine==2 || selectedCuisine==3){
            const buttonId = $(this).attr('id'); // Get the ID of the clicked radio input
            const button = $(`label[for='${buttonId}']`); // Find the corresponding label by ID
           
            prevPrice = selectionfilter(button,prevPrice)
           
            filterCardsByPrice(selectedCuisine,this);
        }
        else if(selectedCuisine == "Right"){
           
            slideRight();
        }
        else if(selectedCuisine == "Left"){
            slideLeft();
        }
        else if(selectedCuisine == "reset"){
            prevPrice.toggleClass('selected');
            prevPrice = null;
            prevRating.toggleClass('selected');
            prevRating = null;
            $filters = ["","",""];
            var $restaurantsContainer = $('#restaurants');
            var $cards = $restaurantsContainer.find('.card-res ');
            $('.btn-check').prop('checked', false);
            updateCards($cards,$filters);
        }
        else{
            filterCardsByCuisine(selectedCuisine,this);
        }
        
   });
   $('.btn-clear').on('click', function() {
        var selectedCuisine = $(this).val();
        filterCardsByCuisine(selectedCuisine);
   });      

// arrows for scolling
var scrollpos = 0;
var prev=-1;
function slideRight() {
    
    var scrollStep = 200; // Adjust the value to change scroll step
    var container = $('#sildefilter');
    container.scrollLeft(scrollpos+scrollStep);
    if(prev != container.scrollLeft()){
        
        scrollpos += scrollStep;
    }
    prev = container.scrollLeft();
    
    };

function slideLeft() {
    var scrollStep = 200; // Adjust the value to change scroll step
    var container = $('#sildefilter');
    scrollpos -= scrollStep;
    if(scrollpos < 0){
        scrollpos=0;
    }
    container.scrollLeft(scrollpos);
    };

    var optionsPrice = {
        html: true,
        title: "Price",
        //html element
        //content: $("#popover-content")
        content: $('[data-name="popover-content-price"]')
        //Doing below won't work. Shows title only
        //content: $("#popover-content").html()

    }
    function insidepopover(popover,instance,event,name){
        if (
            !popover.contains(event.target) && // Clicked outside of price popover trigger
            !(isElementInsidePricePopoverContent(event.target,name))
        ) {
            instance.hide();       
        }
    }
    function eventfilter(Popover,Instance,name){
        body.addEventListener('click', function (event) {
            insidepopover(Popover,Instance,event,name);
        });
    }
    function isElementInsidePricePopoverContent(element,name) {
        if(element.id != ""){
            if(element.id == name || element.name == (name)){
                return true;
            }
            else
                return false;
        } 
        return false;
    }
    var pricePopover = document.getElementById('price-filter')
    var pricePopoverInstance  = new bootstrap.Popover(pricePopover, optionsPrice)
    pricename = "price";
    var body = document.getElementById('resturantpage')
    
    pricePopover.addEventListener('click', function (event) {
        eventfilter(pricePopover,pricePopoverInstance,pricename); 
    });
   
    var optionsRating = {
        html: true,
        title: "Rating",
        //html element
        //content: $("#popover-content")
        content: $('[data-name="popover-content-rating"]')
        //Doing below won't work. Shows title only
        //content: $("#popover-content").html()

    }
    var ratingPopover = document.getElementById('rating-filter')
    var ratingPopoverInstance = new bootstrap.Popover(ratingPopover, optionsRating)
    ratingname = 'rating';
    ratingPopover.addEventListener('click', function (event) {
        eventfilter(ratingPopover,ratingPopoverInstance,ratingname); 
    }); 
});

