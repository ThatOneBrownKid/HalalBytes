class UsersController < ApplicationController
  def index
    @users = User.all
  end
  
  def show
    @user = User.find(params[:id])
  end

  def edit
    @user = User.find(params[:id])
  
    if current_user.admin?
      # Allow admin user to edit the user profile
      render :edit
    else
      flash[:error] = "You don't have permission to access this page."
      redirect_to root_path
    end
  end

  def update
    @user = User.find(params[:id])
    
    if user_params[:password].blank? && user_params[:password_confirmation].blank?
      # Remove the password fields from the user_params
      updated_user_params = user_params.except(:current_password, :password, :password_confirmation)
      
      if @user.update_without_password(updated_user_params)
        flash[:notice] = "Profile updated successfully."
        redirect_to edit_user_path(@user)
      else
        clean_up_passwords @user
        set_minimum_password_length
        flash.now[:error] = "Failed to update profile: #{resource.errors.full_messages.join(', ')}"
        render :edit
      end
    else
      if @user.update(user_params)
        flash[:notice] = "Password updated successfully."
        redirect_to edit_user_path(@user)
      else
        clean_up_passwords @user
        set_minimum_password_length
        flash.now[:error] = "Failed to update password: #{resource.errors.full_messages.join(', ')}"
        render :edit
      end
    end
  end
  
  
  def update_profile_picture
    @user = current_user
    if @user.update(user_params)
      # Successfully updated profile picture
      redirect_to @user, notice: "Profile picture was successfully updated."
    else
      # Handle errors
      render :edit_profile_picture
    end
  end
  
  
  
  
  

  private

  def user_params
    params.require(:user).permit(:first_name, :last_name, :email, :password, :password_confirmation, :profile_picture)
  end  

end
