// app/javascript/controllers/carousel_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Initialize the Bootstrap carousel when the controller connects
    // 'this.element' refers to the HTML element the controller is attached to.
    // Ensure Bootstrap's JavaScript is loaded via your importmap-rails setup.
    if (typeof bootstrap !== 'undefined') {
       // Use Bootstrap's JavaScript API to initialize the carousel
       // this.element is the div with the data-controller="carousel" attribute
       this.carousel = new bootstrap.Carousel(this.element);

       // Optional: Add Stimulus targets for previous/next buttons if you want
       // to handle navigation through Stimulus actions instead of data-slide attributes.
       // For now, data-slide attributes should work with Bootstrap JS loaded via importmap.

    } else {
       console.error("Bootstrap JavaScript is not loaded.");
       // You might want a retry mechanism or a different approach
    }
  }

  disconnect() {
    // Optional: Clean up the Bootstrap carousel instance when the element is removed from the DOM
    // This prevents memory leaks on Turbo navigations.
    if (this.carousel) {
       this.carousel.dispose();
    }
  }

  // If you wanted Stimulus actions for controls:
  // previous() {
  //   if (this.carousel) {
  //     this.carousel.prev();
  //   }
  // }
  //
  // next() {
  //   if (this.carousel) {
  //     this.carousel.next();
  //   }
  // }
}