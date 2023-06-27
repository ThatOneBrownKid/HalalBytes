class Users::RegistrationsController < Devise::RegistrationsController


  def update
    self.resource = resource_class.to_adapter.get!(send(:"current_#{resource_name}").to_key)
  
    if user_params[:password].present?
      # Check if the current password is entered correctly
      if resource.valid_password?(user_params[:current_password])
        # Update the password if it meets the requirements
        if resource.update_with_password(user_params)
          bypass_sign_in resource, scope: resource_name
          set_flash_message :notice, :updated_password if is_flashing_format?
          redirect_to edit_user_registration_path, notice: "Password updated successfully."
        else
          clean_up_passwords resource
          set_minimum_password_length
          flash.now[:error] = "Failed to update password: #{resource.errors.full_messages.join(', ')}"
          render :edit
        end
      else
        clean_up_passwords resource
        set_minimum_password_length
        flash.now[:error] = "Current password is incorrect. Please try again."
        render :edit
      end
    else
      # Update the profile without requiring the current password
      if resource.update(user_params.except(:current_password, :password, :password_confirmation))
        bypass_sign_in resource, scope: resource_name
        set_flash_message :notice, :updated_profile if is_flashing_format?
        redirect_to edit_user_registration_path, notice: "Profile updated successfully."
      else
        clean_up_passwords resource
        set_minimum_password_length
        flash.now[:error] = "Failed to update profile: #{resource.errors.full_messages.join(', ')}"
        render :edit
      end
    end
  end
  
  

  private

  def sign_up_params
    params.require(:user).permit(:first_name, :last_name, :email, :password, :password_confirmation)
  end

  def user_params
    params.require(:user).permit(:first_name, :last_name, :email, :current_password, :password, :password_confirmation)
  end

end
