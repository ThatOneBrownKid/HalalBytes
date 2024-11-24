

var map; 
document.addEventListener('turbo:load',initMap);

function initMap(updateMarkers=false) {
// Pass the restaurants data from Rails to JavaScript
const blackIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png',
  iconSize: [25, 41],  // Size of the icon
  iconAnchor: [12, 41], // Position of the icon's "tip" on the map
  popupAnchor: [1, -34], // Position of the popup relative to the icon
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  shadowSize: [41, 41]   // Size of the shadow
  });
if (updateMarkers === true){
  loadRestaurants();
  return
}
var restaurants;

   
  console.log("Turbo load triggered");
   // Initialize the map with a default view
   if (typeof L === 'undefined') {
   console.error("Leaflet (L) is not defined. Retrying...");
   setTimeout(initMap, 100);  // Retry after a short delay if L is not yet loaded
   return;
   }
   
    // Initialize the map with a default view
   map = L.map('map').setView([51.505, -0.09], 13);

   // Add base tile layer from OpenStreetMap
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
       maxZoom: 19,
       attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
   }).addTo(map);
   // Try to locate the user and set the view based on their location
   map.locate({ setView: true, maxZoom: 16 });

   // Store the current selected card ID
   let currentSelectedCardId = null;

   // Function to fetch and load restaurants within the visible map bounds
   function loadRestaurants() {
    map.eachLayer(function (layer) {
      if (layer instanceof L.Marker) {
          map.removeLayer(layer);
      }
  });
       var bounds = map.getBounds();
       var northEast = bounds.getNorthEast();
       var southWest = bounds.getSouthWest();
       var zoomLevel = map.getZoom();

        // Define the minimum zoom level at which you want to fetch data
       var minZoomLevel = 10;  // Adjust as needed (higher means more zoomed in)
       var lowZoom = true
        // Check if the zoom level is too low (too zoomed out)
        if (zoomLevel < minZoomLevel) {
            lowZoom = false
            console.log("Zoom level is too low. Not fetching data.");
            northEast.lat,northEast.lng,southWest.lat,southWest.lng = 0,200,0,200
        }
          filters.northEastlat = northEast.lat
          filters.northEastlng = northEast.lng
          filters.southWestlat = southWest.lat
          filters.southWestlng = southWest.lng
       // Make an AJAX request to fetch restaurants within the map bounds
       $.ajax({
        url: '/restaurants/filter',
        method: 'GET',
        data: filters,
        success: function(data, textStatus, jqXHR) {
          if (jqXHR.status === 200) {
            $('#restaurants').html(data);
            if(lowZoom){
              updateMapMarkers();
            }
            
          }
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.error("Error fetching filtered data:", errorThrown);
          alert("There was an issue loading the restaurants. Please try again.");
        }
      });
   }

   // Function to update map markers
function updateMapMarkers() {
   // Remove existing markers
   map.eachLayer(function (layer) {
       if (layer instanceof L.Marker) {
           map.removeLayer(layer);
       }
   });

   // Fetch the restaurant data again to place markers
   var bounds = map.getBounds();
   var northEast = bounds.getNorthEast();
   var southWest = bounds.getSouthWest();
   filters.northEastlat = northEast.lat
   filters.northEastlng = northEast.lng
   filters.southWestlat = southWest.lat
   filters.southWestlng = southWest.lng
   $.ajax({
    url: '/restaurants/filter.json',
    method: 'GET',
    data: filters,
    success: function(data, textStatus, jqXHR) {
          //console.log(data); // Contains the restaurant information
          if (data && data.length > 0) { 
          restaurants = data
          // Use `data` to update your map or DOM 
           restaurants.forEach(function(restaurant) {
               //console.log(restaurant.latitude)
               if (restaurant.latitude && restaurant.longitude) {
                   // Add marker to the map
                   var marker = L.marker([restaurant.latitude, restaurant.longitude], { icon: blackIcon }).addTo(map);
                   
                   // Marker click event to highlight the corresponding card
                   marker.on('click', function() {
                       // Deselect the previous card
                       if (currentSelectedCardId) {
                           document.getElementById(currentSelectedCardId).classList.remove('selected');
                           currentSelectedCardId = '';
                       }

                       // Select the new card
                       currentSelectedCardId = 'restaurant_' + restaurant.id;
                       var restaurantCard = document.getElementById(currentSelectedCardId);
                       if (restaurantCard) {
                           restaurantCard.classList.add('selected');
                           restaurantCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                       }
                   });
               }
           });
          }
        },
        error: function(jqXHR, textStatus, errorThrown) {
          if (jqXHR.status === 404) {
              // Handle 404 Not Found error
              console.error("No restaurants found in this area.");
          } else {
              // Handle other errors
              console.error("Error fetching filtered data:", errorThrown);
              alert("There was an issue loading the restaurants. Please try again.");
          }
        }
        });
}

   document.addEventListener('click', function(event) {
       // Check if the clicked target is not within a restaurant card or a marker
       if (!event.target.closest('.restaurant-card') && !event.target.closest('.leaflet-marker-icon')) {
           if (currentSelectedCardId) {
               document.getElementById(currentSelectedCardId).classList.remove('selected'); // Remove the selected class from the currently selected card
               currentSelectedCardId = null; // Reset the selected card ID
           }
       }
       })
   // Load restaurants when the map is moved or zoomed
   map.on('moveend', loadRestaurants);

   // Initial load of restaurants when the page first loads
   loadRestaurants();
};


let filters = {
  cuisine: "",
  price: "",
  rating: ""
};

function selectionfilter(button, prev) {
  if (prev != null) {
    if (prev[0] == button[0]) {
      button.toggleClass('selected');
      prev = null;
    } else {
      prev.toggleClass('selected');
      prev = button;
      button.toggleClass('selected');
    }
  } else {
    prev = button;
    button.toggleClass('selected');
  }
  return prev;
}

var prevPrice = null;
var prevRating = null;
var prevCuisine = null;

document.addEventListener('turbo:load', function() {
  $('.btn-check').on("click", function() {
    const buttonId = $(this).attr('id');
    const button = $(`label[for='${buttonId}']`);
    const selected = $(this).val();

    if (selected === "reset") {
      filters = { cuisine: "", price: "", rating: "" };
      if (prevPrice) prevPrice.toggleClass('selected');
      if (prevRating) prevRating.toggleClass('selected');
      if (prevCuisine) prevCuisine.toggleClass('selected');
      prevPrice = prevRating = prevCuisine = null;
      $('.btn-check').prop('checked', false);
    } else if (selected == 2.9 || selected == 4.0 || selected == 5) {
      if (filters.rating === selected) {
        filters.rating = ""; // Deselecting the rating filter
        prevRating = selectionfilter(button, prevRating);
        $(this).prop('checked', false); // Uncheck the radio button
      } else {
        prevRating = selectionfilter(button, prevRating);
        filters.rating = selected;
      }
    } else if (selected == 1 || selected == 2 || selected == 3) {
      if (filters.price === selected) {
        filters.price = ""; // Deselecting the price filter
        prevPrice = selectionfilter(button, prevPrice);
        $(this).prop('checked', false); // Uncheck the radio button
      } else {
        prevPrice = selectionfilter(button, prevPrice);
        filters.price = selected;
      }
    } else {
      if (filters.cuisine === selected) {
        filters.cuisine = ""; // Deselecting the cuisine filter
        prevCuisine = selectionfilter(button, prevCuisine);
        $(this).prop('checked', false); // Uncheck the radio button
      } else {
        prevCuisine = selectionfilter(button, prevCuisine);
        filters.cuisine = selected;
      }
    }
    var bounds = map.getBounds();
    var northEast = bounds.getNorthEast();
    var southWest = bounds.getSouthWest();
    var zoomLevel = map.getZoom();
    var minZoomLevel = 10;  // Adjust as needed (higher means more zoomed in)
        // Check if the zoom level is too low (too zoomed out)
        if (zoomLevel < minZoomLevel) {
            console.log("Zoom level is too low. Not fetching data.");
            northEast.lat,northEast.lng,southWest.lat,southWest.lng = 200,800,100,200
        }
    filters.northEastlat = northEast.lat
    filters.northEastlng = northEast.lng
    filters.southWestlat = southWest.lat
    filters.southWestlng = southWest.lng

    
    //console.log(filters)
    // Perform AJAX request to fetch filtered data
    $.ajax({
      url: '/restaurants/filter',
      method: 'GET',
      data: filters,
      success: function(data, textStatus, jqXHR) {
        if (jqXHR.status === 200) {
          $('#restaurants').html(data);
          var updateMarkers = true
          initMap(updateMarkers);
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error("Error fetching filtered data:", errorThrown);
        alert("There was an issue loading the restaurants. Please try again.");
      }
    });
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
    var pricename = 'price';
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
    var ratingname = 'rating';
    ratingPopover.addEventListener('click', function (event) {
        eventfilter(ratingPopover,ratingPopoverInstance,ratingname); 
    }); 
});