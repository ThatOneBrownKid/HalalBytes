Rails.application.routes.draw do
  get 'users/index'
  devise_for :users, controllers: {
    registrations: 'users/registrations',
    sessions: 'users/sessions', 
    passwords: 'users/passwords'
  }
  resources :restaurants
  root 'home#index'
  resources :users, only: [:edit, :update, :show] do
    get 'edit', on: :collection, to: 'users#edit'
  end
  match '/users', to: 'users#index', via: 'get'
  get 'requests/form', to: 'requests#form'

  patch '/users/basic_info', to: 'users/registrations#update', as: :update_basic_info
  patch '/users/password', to: 'users/passwords#update', as: :update_password

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
