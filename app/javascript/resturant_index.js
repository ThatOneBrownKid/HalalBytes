src="https://code.jquery.com/jquery-3.6.0.min.js">

$(document).ready(function() {
  // Retrieve the cuisine data from your backend for filters
  var prev = '';
  
  function filterCardsByCuisine(selectedCuisine,hi) {
        var $restaurantsContainer = $('#restaurants');
        var $cards = $restaurantsContainer.find('.card-res ');
        var $cusines = $restaurantsContainer.find('.hover-box ');

        if (selectedCuisine == prev){
            selectedCuisine = 'ALL';
            $(hi).prop('checked', false);
            prev = '';
        }
         prev = selectedCuisine;
        $cards.each(function() {
           
            
            var cuisine = $(this).find('.hover-box ').text().trim();
            if (cuisine === selectedCuisine) {
                $(this).show();
            } 
            else if (selectedCuisine == 'ALL'){
                $(this).show();
            }           
            else {
                $(this).hide();
            }
        }
        
        )};

        function filterCardsByPrice(selectedPrice,hi) {
            var $restaurantsContainer = $('#restaurants');
            var $cards = $restaurantsContainer.find('.card-res ');
            
            if ($(this).is(':checked') || selectedPrice == prev){
                var temp = selectedPrice;
                $(this).prop('checked', false);
                prev = '';
                $cards.each(function() {
                    var price = $(this).find('.ratings ').text().trim();
                    if (price === temp) {
                        $(this).hide();
                    } 
                });
            }
            else{
            prev = selectedPrice;
            $cards.each(function() {   
                var price = $(this).find('.ratings ').text().trim();
                if (price === selectedPrice) {
                    $(this).show();
                } 
                else if (selectedPrice == 'ALL'){
                    $(this).show();
                }           
                else {
                    $(this).hide();
                }
            }
            
            )}
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

