# Pin npm packages by running ./bin/importmap
pin "application", preload: true
pin "turbo", to: "turbo.min.js", preload: true
pin "@rails/ujs", to: "https://cdn.skypack.dev/@rails/ujs", preload: true
pin '@hotwired/turbo-rails', to: 'turbo.min.js', preload: true
pin '@hotwired/stimulus', to: 'stimulus.min.js', preload: true
pin '@hotwired/stimulus-loading', to: 'stimulus-loading.js', preload: true
pin "controllers/restaurant_index", to: "controllers/restaurant_index.js", preload: true
pin_all_from 'app/javascript/controllers', under: 'controllers', preload: true
pin "dropzone", to: "https://ga.jspm.io/npm:dropzone@6.0.0-beta.2/dist/dropzone.mjs", preload: true
pin "just-extend", to: "https://ga.jspm.io/npm:just-extend@5.1.1/index.esm.js", preload: true
pin "@rails/activestorage", to: "https://ga.jspm.io/npm:@rails/activestorage@7.1.3-2/app/assets/javascripts/activestorage.esm.js", preload: true
pin "jquery", to: "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.js", preload: true
pin "jquery-ui", to: "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js", preload: true
pin "timepicker", to: "vendor/jquery.timepicker.min.js", preload: true
pin "sortable", to: "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js", preload: true
pin "popper", to: "https://unpkg.com/@popperjs/core@2", preload: true
pin "bootstrap", to: "vendor/bootstrap.min.js", preload: true
pin "dropzone-helper", to: "helpers/dropzone.js", preload: true
pin "leaflet", to: "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js", preload: true
pin "leaflet-providers", to: "https://unpkg.com/leaflet-providers@latest/leaflet-providers.js", preload: true

