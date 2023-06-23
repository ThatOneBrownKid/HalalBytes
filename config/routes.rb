Rails.application.routes.draw do
  get 'users/index'
  devise_for :users, controllers: {
    registrations: 'users/registrations',
    sessions: 'users/sessions'
  }
  resources :restaurants
  root 'home#index'
  resources :users, only: [:edit, :update, :show] do
    get 'edit', on: :collection, to: 'users#edit'
  end
  match '/users', to: 'users#index', via: 'get'
  get 'requests/form', to: 'requests#form'

  put '/users', to: 'users/registrations#update'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
