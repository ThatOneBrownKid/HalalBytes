class RequestsController < ApplicationController
  protect_from_forgery except: :upload_images
    def form
        # Add any necessary code to handle the form request
      end

      def upload_images
        # Implement file upload handling logic here
        # For example, saving the uploaded files and associating them with a restaurant record
    
        # Respond to the upload request, e.g., with a status message
        render json: { message: "Files uploaded successfully." }, status: :ok
      end
end
