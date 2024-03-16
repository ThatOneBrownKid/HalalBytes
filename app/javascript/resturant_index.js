src="https://code.jquery.com/jquery-3.6.0.min.js">

$(document).ready(function() {
  // Retrieve the cuisine data from your backend for filters
  var prev = '';
  var $hiddenCards = $();
  var $filters = ["",""];
  function updateCards($cards,$filters){
    $cards.each(function() {
        var showCard = true;
        var $attributes = [];
        $attributes.push($(this).find('.hover-box ').text().trim());
        $attributes.push($(this).find('.ratings ').text().trim());
        
        for (var i = 0; i < $filters.length; i++) {
            if ($attributes[i] !== $filters[i] && $filters[i] != "") {
                showCard = false;
                break; // Exit the loop early if a mismatch is found
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
                $filters[1] = 0;
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
  $('.btn-check').on( "click", function() {
        var selectedCuisine = $(this).val();
        if(selectedCuisine == 1 || selectedCuisine==2 || selectedCuisine==3){
            
            filterCardsByPrice(selectedCuisine,this);
        }
        else{
            filterCardsByCuisine(selectedCuisine,this);
        }
        
   });
   $('.btn-clear').on('click', function() {
        var selectedCuisine = $(this).val();
        filterCardsByCuisine(selectedCuisine);
   });

// Price filter




// filter modals
   const myModal = document.getElementById('exampleModal')
   const myInput = document.getElementById('myInput')
    myModal.addEventListener('shown.bs.modal', () => {
    myInput.focus()
    })
      
   
});

