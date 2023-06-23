class Users::RegistrationsController < Devise::RegistrationsController


  def update
    self.resource = resource_class.to_adapter.get!(send(:"current_#{resource_name}").to_key)
  
    if resource.update(user_params)
      set_flash_message :notice, :updated if is_flashing_format?
      bypass_sign_in resource, scope: resource_name
      redirect_to edit_registration_path(resource) # Redirect to the edit page
    else
      render :edit
    end
  end

  private

  def sign_up_params
    params.require(:user).permit(:first_name, :last_name, :admin, :email, :password, :password_confirmation)
  end

  def user_params
    puts "Executing user_params method" # Add this line for debugging
    params.require(:user).permit(:first_name, :last_name, :email, :password, :password_confirmation)
  end
end
