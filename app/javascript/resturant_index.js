var map;
var filters = {
  cuisine: "",
  price: "",
  rating: "",
};
var prevPrice = null;
var prevRating = null;
var prevCuisine = null;
// Function to get filters from the URL hash
function getFiltersFromHash() {
  // Get the hash from the URL
  const hash = window.location.hash;

  // Check if the hash contains "filters="
  if (hash && hash.startsWith("#filters=")) {
    try {
      // Extract and decode the filters
      const serializedFilters = hash.split("=")[1];
      if (serializedFilters != null) {
        filters = JSON.parse(atob(serializedFilters));
        updateFiltersAndUI();
      }
    } catch (e) {
      console.error("Error parsing filters from URL hash:", e);
    }
  }
}
document.addEventListener("turbo:load", initMap);
document.addEventListener("turbo:load", getFiltersFromHash);

function initMap(updateMarkers = false) {
  // Pass the restaurants data from Rails to JavaScript
  const blackIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png",
    iconSize: [25, 41], // Size of the icon
    iconAnchor: [12, 41], // Position of the icon's "tip" on the map
    popupAnchor: [1, -34], // Position of the popup relative to the icon
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
    shadowSize: [41, 41], // Size of the shadow
  });
  if (updateMarkers === true) {
    loadRestaurants();
    return;
  }
  var restaurants;
  var geoapifyApiKey = window.geoapifyApiKey;

  console.log("Turbo load triggered");
  // Initialize the map with a default view
  if (typeof L === "undefined") {
    console.error("Leaflet (L) is not defined. Retrying...");
    setTimeout(initMap, 100); // Retry after a short delay if L is not yet loaded
    return;
  }

  // Initialize the map with a default view
  map = L.map("map");

  // Add base tile layer from OpenStreetMap
  L.tileLayer(
    "https://maps.geoapify.com/v1/tile/klokantech-basic/{z}/{x}/{y}.png?apiKey=" +
      geoapifyApiKey,
    {
      maxZoom: 20,
      minZoom: 3,
      attribution:
        'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
    }
  ).addTo(map);
  // Try to locate the user and set the view based on their location
  map
    .locate({ setView: true, maxZoom: 16 })
    .on("locationfound", function (e) {
      loadRestaurants();
    })
    .on("locationerror", function () {
      console.error("Geolocation failed. Falling back to IP-based location.");

      // Make a fallback AJAX call to fetch IP-based location
      $.ajax({
        url: "/get_location", // Endpoint to get IP-based location
        method: "GET",
        success: function (data) {
          if (data.latitude && data.longitude) {
            // Set map view based on IP-based location
            map.setView([data.latitude, data.longitude], 12); // Adjust zoom level as needed
          } else {
            console.error("IP-based location not available.");
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.error("Error fetching IP-based location:", errorThrown);
        },
      });
      loadRestaurants();
    });

  // Store the current selected card ID
  let currentSelectedCardId = null;
  function updateFiltersInHash(filters) {
    const serializedFilters = btoa(JSON.stringify(filters));
    const newUrl = `${window.location.pathname}#filters=${serializedFilters}`;
    history.pushState(null, "", newUrl); // Update the URL without reloading
  }

  // Function to fetch and load restaurants within the visible map bounds
  function loadRestaurants() {
    var bounds = map.getBounds();
    var northEast = bounds.getNorthEast();
    var southWest = bounds.getSouthWest();
    var zoomLevel = map.getZoom();

    // Define the minimum zoom level at which you want to fetch data
    var minZoomLevel = 10; // Adjust as needed (higher means more zoomed in)
    var lowZoom = true;
    // Check if the zoom level is too low (too zoomed out)
    if (zoomLevel < minZoomLevel) {
      lowZoom = false;
      console.log("Zoom level is too low. Not fetching data.");
      northEast.lat,
        northEast.lng,
        southWest.lat,
        (southWest.lng = 0),
        200,
        0,
        200;
    }
    filters.northEastlat = northEast.lat;
    filters.northEastlng = northEast.lng;
    filters.southWestlat = southWest.lat;
    filters.southWestlng = southWest.lng;
    // Make an AJAX request to fetch restaurants within the map bounds
    $.ajax({
      url: "/restaurants/filter",
      method: "GET",
      data: filters,
      success: function (data, textStatus, jqXHR) {
        if (jqXHR.status === 200) {
          $("#restaurants").html(data);
          $("#restaurants-mobile").html(data);
          updateFiltersInHash(filters);
          if (lowZoom) {
            updateMapMarkers();
          } else {
            map.eachLayer(function (layer) {
              if (layer instanceof L.Marker) {
                map.removeLayer(layer);
              }
            });
          }
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching filtered data:", errorThrown);
        alert("There was an issue loading the restaurants. Please try again.");
      },
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
    filters.northEastlat = northEast.lat;
    filters.northEastlng = northEast.lng;
    filters.southWestlat = southWest.lat;
    filters.southWestlng = southWest.lng;
    $.ajax({
      url: "/restaurants/filter.json",
      method: "GET",
      data: filters,
      success: function (data, textStatus, jqXHR) {
        //console.log(data); // Contains the restaurant information
        if (data && data.length > 0) {
          restaurants = data;
          // Use `data` to update your map or DOM
          restaurants.forEach(function (restaurant) {
            //console.log(restaurant.latitude)
            if (restaurant.latitude && restaurant.longitude) {
              // Add marker to the map
              var marker = L.marker(
                [restaurant.latitude, restaurant.longitude],
                { icon: blackIcon }
              ).addTo(map);

              // Marker click event to highlight the corresponding card
              marker.on("click", function () {
                // Deselect the previous card
                if (currentSelectedCardId) {
                  document
                    .getElementById(currentSelectedCardId)
                    .classList.remove("selected");
                  currentSelectedCardId = "";
                }

                // Select the new card
                currentSelectedCardId = "restaurant_" + restaurant.id;
                var restaurantCard = document.getElementById(
                  currentSelectedCardId
                );
                if (restaurantCard) {
                  restaurantCard.classList.add("selected");
                  restaurantCard.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              });
            }
          });
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 404) {
          // Handle 404 Not Found error
          console.error("No restaurants found in this area.");
        } else {
          // Handle other errors
          console.error("Error fetching filtered data:", errorThrown);
          alert(
            "There was an issue loading the restaurants. Please try again."
          );
        }
      },
    });
  }

  document.addEventListener("click", function (event) {
    // Check if the clicked target is not within a restaurant card or a marker
    if (
      !event.target.closest(".restaurant-card") &&
      !event.target.closest(".leaflet-marker-icon")
    ) {
      if (currentSelectedCardId) {
        document
          .getElementById(currentSelectedCardId)
          .classList.remove("selected"); // Remove the selected class from the currently selected card
        currentSelectedCardId = null; // Reset the selected card ID
      }
    }
  });
  // Load restaurants when the map is moved or zoomed
  map.on("moveend", loadRestaurants);

  // Initial load of restaurants when the page first loads
}

function updateFiltersAndUI() {
  // Iterate through all `.btn-check` elements
  $(".btn-check").each(function () {
    const buttonId = $(this).attr("id");
    const button = $(this);
    const buttonName = button.attr("name"); // e.g., "options", "price", "rating"
    const buttonValue = button.val(); // Value of the button, e.g., "cuisine", "1", "4.0"
    // Check if the button's name matches a filter key in `filters`
    if (filters.hasOwnProperty(buttonName)) {
      // Get the current selected value for the filter
      const selectedValue = filters[buttonName];
      if (selectedValue === buttonValue) {
        // Mark the button as selected if it matches the filter value

        button.toggleClass("selected");
        button.prop("checked", true);
      } else {
        // Deselect the button if it doesn't match
        button.toggleClass("selected");
        button.prop("checked", false);
      }
    }
  });
}

//document.addEventListener("turbo:load", function () {
$(document)
  .off("click", ".btn-check")
  .on("click", ".btn-check", function () {
    const buttonId = $(this).attr("id");
    const button = $(`label[for='${buttonId}']`);
    const selected = $(this).val();

    if (selected === "reset") {
      filters = { cuisine: "", price: "", rating: "" };
      if (prevPrice) prevPrice.toggleClass("selected");
      if (prevRating) prevRating.toggleClass("selected");
      if (prevCuisine) prevCuisine.toggleClass("selected");
      prevPrice = prevRating = prevCuisine = null;

      $(".btn-check").prop("checked", false);
    } else if (selected == 2.9 || selected == 4.0 || selected == 5) {
      if (filters.rating === selected) {
        filters.rating = "";
        updateFiltersAndUI();
      } else {
        filters.rating = selected;
        updateFiltersAndUI();
      }
    } else if (selected == 1 || selected == 2 || selected == 3) {
      if (filters.price === selected) {
        filters.price = "";
        updateFiltersAndUI();
      } else {
        filters.price = selected;
        updateFiltersAndUI();
      }
    } else {
      if (filters.cuisine === selected) {
        filters.cuisine = "";
        updateFiltersAndUI();
      } else {
        filters.cuisine = selected;
        updateFiltersAndUI();
      }
    }
    var bounds = map.getBounds();
    var northEast = bounds.getNorthEast();
    var southWest = bounds.getSouthWest();
    var zoomLevel = map.getZoom();
    var minZoomLevel = 10; // Adjust as needed (higher means more zoomed in)
    // Check if the zoom level is too low (too zoomed out)
    if (zoomLevel < minZoomLevel) {
      console.log("Zoom level is too low. Not fetching data.");
      northEast.lat,
        northEast.lng,
        southWest.lat,
        (southWest.lng = 200),
        800,
        100,
        200;
    }
    filters.northEastlat = northEast.lat;
    filters.northEastlng = northEast.lng;
    filters.southWestlat = southWest.lat;
    filters.southWestlng = southWest.lng;

    //console.log(filters)
    // Perform AJAX request to fetch filtered data
    $.ajax({
      url: "/restaurants/filter",
      method: "GET",
      data: filters,
      success: function (data, textStatus, jqXHR) {
        if (jqXHR.status === 200) {
          $("#restaurants").html(data);
          $("#restaurants-mobile").html(data);
          var updateMarkers = true;
          initMap(updateMarkers);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching filtered data:", errorThrown);
        alert("There was an issue loading the restaurants. Please try again.");
      },
    });
  });

// arrows for scolling
var scrollpos = 0;
var prev = -1;
function slideRight() {
  var scrollStep = 200; // Adjust the value to change scroll step
  var container = $("#sildefilter");
  container.scrollLeft(scrollpos + scrollStep);
  if (prev != container.scrollLeft()) {
    scrollpos += scrollStep;
  }
  prev = container.scrollLeft();
}

function slideLeft() {
  var scrollStep = 200; // Adjust the value to change scroll step
  var container = $("#sildefilter");
  scrollpos -= scrollStep;
  if (scrollpos < 0) {
    scrollpos = 0;
  }
  container.scrollLeft(scrollpos);
}

var optionsPrice = {
  html: true,
  title: "Price",
  //html element
  //content: $("#popover-content")
  content: $('[data-name="popover-content-price"]'),
  //Doing below won't work. Shows title only
  //content: $("#popover-content").html()
};
function insidepopover(popover, instance, event, name) {
  if (
    !popover.contains(event.target) && // Clicked outside of price popover trigger
    !isElementInsidePricePopoverContent(event.target, name)
  ) {
    instance.hide();
  }
}
function eventfilter(Popover, Instance, name) {
  body.addEventListener("click", function (event) {
    insidepopover(Popover, Instance, event, name);
  });
}
function isElementInsidePricePopoverContent(element, name) {
  if (element.id != "") {
    if (element.id == name || element.name == name) {
      return true;
    } else return false;
  }
  return false;
}
var pricePopover = document.getElementById("price-filter");
var pricePopoverInstance = new bootstrap.Popover(pricePopover, optionsPrice);
var pricename = "price";
var body = document.getElementById("resturantpage");

pricePopover.addEventListener("click", function (event) {
  eventfilter(pricePopover, pricePopoverInstance, pricename);
});

var optionsRating = {
  html: true,
  title: "Rating",
  //html element
  //content: $("#popover-content")
  content: $('[data-name="popover-content-rating"]'),
  //Doing below won't work. Shows title only
  //content: $("#popover-content").html()
};
var ratingPopover = document.getElementById("rating-filter");
var ratingPopoverInstance = new bootstrap.Popover(ratingPopover, optionsRating);
var ratingname = "rating";
ratingPopover.addEventListener("click", function (event) {
  eventfilter(ratingPopover, ratingPopoverInstance, ratingname);
});
