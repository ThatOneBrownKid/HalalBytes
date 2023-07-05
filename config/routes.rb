Rails.application.routes.draw do
  get 'users/index'
  get '/terms_and_services', to: 'home#terms_and_services'
  devise_for :users, controllers: {
    registrations: 'users/registrations',
    sessions: 'users/sessions'
  }
  resources :restaurants do
    member do
      delete 'images/:image_id', action: :delete_image, as: :delete_image
    end
  end
  root 'home#index'
  resources :users, only: [:edit, :update, :show] do
    get 'edit', on: :collection, to: 'users#edit'
  end
  match '/users', to: 'users#index', via: 'get'
  get 'requests/form', to: 'requests#form'

  patch '/users/basic_info', to: 'users/registrations#update', as: :update_basic_info

  

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
