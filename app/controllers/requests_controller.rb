class RequestsController < ApplicationController
  protect_from_forgery except: :upload_images
    def form
        # Add any necessary code to handle the form request
    end
end
