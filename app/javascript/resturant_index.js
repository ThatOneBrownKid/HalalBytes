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
  $('.btn-check').on( "click", function() {
        var selectedCuisine = $(this).val();
        if(selectedCuisine == 2.9 || selectedCuisine== 4.0 || selectedCuisine==5){
            
            filterCardsByRating(selectedCuisine,this);
            
        }
        else if(selectedCuisine == 1 || selectedCuisine==2 || selectedCuisine==3){
            
            filterCardsByPrice(selectedCuisine,this);
        }
        else if(selectedCuisine == "Right"){
           
            slideRight();
        }
        else if(selectedCuisine == "Left"){
            slideLeft();
        }
        else if(selectedCuisine == "reset"){
            var $filters = ["","",""];
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

    var options = {
        html: true,
        title: "Price",
        //html element
        //content: $("#popover-content")
        content: $('[data-name="popover-content"]')
        //Doing below won't work. Shows title only
        //content: $("#popover-content").html()

    }
    var exampleEl = document.getElementById('price-filter')
    var popover = new bootstrap.Popover(exampleEl, options)
    
});

