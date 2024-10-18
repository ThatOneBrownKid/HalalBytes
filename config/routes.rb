Rails.application.routes.draw do
  get 'restaurants/request_new', to: 'restaurants#request_new', as: :request_new_restaurants
  post 'restaurants/request_create', to: 'restaurants#request_create', as: :request_create_restaurants
  get 'requested_restaurants', to: 'restaurants#requested'
  get 'all_requested', to: 'restaurants#all_requested'
  get 'users/index'
  get '/terms_and_services', to: 'home#terms_and_services'
  devise_for :users, controllers: {
    registrations: 'users/registrations',
    sessions: 'users/sessions'
  }
  resources :restaurants do
    member do
      delete 'images/:image_id', action: :delete_image, as: :delete_image
      post 'accept' => 'restaurants#accept_restaurant'
    end
    collection do
      get 'markers'  # This is the route for your markers method
    end
  end
  root 'home#index'
  resources :users, only: [:edit, :update, :show] do
    get 'edit', on: :collection, to: 'users#edit'
  end
  match '/users', to: 'users#index', via: 'get'
  get 'requests/form', to: 'requests#form'

  patch '/users/basic_info', to: 'users/registrations#update', as: :update_basic_info
  patch 'restaurants/:id/update_images_order', to: 'restaurants#update_images_order', as: 'update_images_order'


  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
