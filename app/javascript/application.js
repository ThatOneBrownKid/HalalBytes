// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
// Import @rails/ujs
import Rails from "@rails/ujs";

// Start Rails UJS
Rails.start(); 

import $ from 'jquery';

// Import specific jQuery UJS features if needed
import 'jquery-ujs';

// Import other JavaScript files using ES6 module syntax
import './javascript';