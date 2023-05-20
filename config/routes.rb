Rails.application.routes.draw do
  get 'users/index'
  devise_for :users, controllers: {
    registrations: 'users/registrations',
    sessions: 'users/sessions'
  }
  resources :restaurants
  root 'home#index'
  resources :users
  match '/users',   to: 'users#index',   via: 'get'
  
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
