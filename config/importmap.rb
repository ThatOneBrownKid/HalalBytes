# Pin npm packages by running ./bin/importmap

pin "turbo", to: "turbo.min.js", preload: true
pin "application", preload: true
pin "@rails/ujs", to: "https://cdn.skypack.dev/@rails/ujs"
pin '@hotwired/turbo-rails', to: 'turbo.min.js', preload: true
pin '@hotwired/stimulus', to: 'stimulus.min.js', preload: true
pin '@hotwired/stimulus-loading', to: 'stimulus-loading.js', preload: true
pin_all_from 'app/javascript/controllers', under: 'controllers'
pin "dropzone", to: "https://ga.jspm.io/npm:dropzone@6.0.0-beta.2/dist/dropzone.mjs"
pin "just-extend", to: "https://ga.jspm.io/npm:just-extend@5.1.1/index.esm.js"
pin "@rails/activestorage", to: "https://ga.jspm.io/npm:@rails/activestorage@7.1.3-2/app/assets/javascripts/activestorage.esm.js"
