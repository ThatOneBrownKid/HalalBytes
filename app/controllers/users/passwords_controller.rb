# frozen_string_literal: true

class Users::PasswordsController < Devise::PasswordsController
  # GET /resource/password/new
  # def new
  #   super
  # end

  # POST /resource/password
  # def create
  #   super
  # end

  # GET /resource/password/edit?reset_password_token=abcdef
  # def edit
  #   super
  # end

  # PUT /resource/password
  # def update
  #   super
  # end

  # protected

  # def after_resetting_password_path_for(resource)
  #   super(resource)
  # end

  # The path used after sending reset password instructions
  # def after_sending_reset_password_instructions_path_for(resource_name)
  #   super(resource_name)
  # end


  def update
    self.resource = resource_class.find(current_user.id)
    
    # Check if the current password is entered correctly
    if resource.valid_password?(password_params[:current_password])
      # Update the password
      if resource.update(password: password_params[:new_password])
        bypass_sign_in(resource, scope: resource_name)
        redirect_to settings_path, notice: "Password updated successfully."
      else
        flash[:error] = "Failed to update password. Please check the entered information."
        render :edit
      end
    else
      flash[:error] = "Current password is incorrect."
      render :edit
    end
  end

  protected

  def password_params
    params.require(:user).permit(:current_password, :password, :password_confirmation)
  end

end
