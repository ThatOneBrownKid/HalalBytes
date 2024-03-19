class RestaurantsController < ApplicationController
  before_action :set_restaurant, only: [:show, :edit, :update, :destroy]
  skip_before_action :set_restaurant, only: [:request_new, :request_create]
  include RestaurantsHelper

  # GET /restaurants or /restaurants.json
  def index
    @restaurants = Restaurant.all
  end

  # GET /restaurants/1 or /restaurants/1.json
  def show
    @restaurant = Restaurant.find(params[:id])
    @ordered_images = @restaurant.ordered_images
  end

  # GET /restaurants/new
  def new
    @restaurant = Restaurant.new
  end

  # GET /restaurants/1/edit
  def edit
  end

  def request_new
    @restaurant = Restaurant.new
  end

  # POST /restaurants/request_create
  def request_create
    @restaurant = Restaurant.new(restaurant_params)
    process_operating_times
    @restaurant.requested_by = "#{current_user.first_name}_#{current_user.last_name}_#{current_user.id}"
    @restaurant.keep = false
    @restaurant.created_by = nil

    respond_to do |format|
      if @restaurant.save
        format.html { redirect_to restaurant_url(@restaurant), notice: "Your request has been submitted." }
        format.json { render :show, status: :created, location: @restaurant }
      else
        flash.now[:alert] = @restaurant.errors.full_messages.join(', ')
        format.html { render :request_new, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      end
    end
  end

  # POST /restaurants or /restaurants.json
  def create
    @restaurant = Restaurant.new(restaurant_params)
    process_operating_times
    if user_signed_in?
      @restaurant.created_by = "#{current_user.first_name}_#{current_user.last_name}_#{current_user.id}"
    end

    respond_to do |format|
      if @restaurant.save
        format.html { redirect_to restaurant_url(@restaurant), notice: "Restaurant was successfully created." }
        format.json { render :show, status: :created, location: @restaurant }
      else
        flash.now[:alert] = @restaurant.errors.full_messages.join(', ')
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /restaurants/1 or /restaurants/1.json
  def update
    process_operating_times
  
    respond_to do |format|
      if @restaurant.update(conditional_restaurant_params)
        format.html { redirect_to restaurant_url(@restaurant), notice: "Restaurant was successfully updated." }
        format.json { render :show, status: :ok, location: @restaurant }
      else
        flash.now[:alert] = @restaurant.errors.full_messages.join(', ')
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      end
    end
  end

  def update_images_order
    respond_to do |format|
      if params[:attachment].present?
        ActiveRecord::Base.transaction do  # Wrap updates in a transaction
          params[:attachment].each_with_index do |id, index|
            image = ActiveStorage::Attachment.find_by(id: id)
            if image
              image.update!(position: index)
            else
              flash.now[:alert] = "Image not found with ID: #{id}"
              raise ActiveRecord::Rollback  # Rollback the transaction
            end
          end
        end
        format.js { render js: "window.location.reload();" }

      else
        flash.now[:alert] = 'No images provided'
      end
    end
  end

  def delete_image
    @restaurant = Restaurant.find(params[:id])
    image = @restaurant.images.find(params[:image_id])
    image.purge
    redirect_to @restaurant, notice: "Image successfully deleted."
  end

  # DELETE /restaurants/1 or /restaurants/1.json
  def destroy
    keep_status = @restaurant.keep
    @restaurant.destroy
  
    respond_to do |format|
      if keep_status == true
        format.html { redirect_to restaurants_url, notice: "Restaurant was successfully deleted." }
        format.json { head :no_content, status: :ok }
      else
        format.html { redirect_to all_requested_path, notice: "Restaurant was successfully deleted." }
        format.json { head :no_content, status: :ok }
      end
    end
  end
  
  

  def requested
    user_identifier = "#{current_user.first_name}_#{current_user.last_name}_#{current_user.id}"
    @restaurants = Restaurant.where(requested_by: user_identifier)
  end

  def all_requested
    @restaurants = Restaurant.where(keep: false)
  end

  def accept_restaurant
    @restaurant = Restaurant.find(params[:id])
  
    respond_to do |format|
      @restaurant.created_by = "#{current_user.first_name}_#{current_user.last_name}_#{current_user.id}"
      if @restaurant.update(keep: true)
        flash[:notice] = "Restaurant added successfully."
        format.js
      else
        flash[:alert] = "Failed to add restaurant."
        format.js
      end
    end
  end  

  private

  def process_operating_times
    %w[monday tuesday wednesday thursday friday saturday sunday].each do |day|
      open_time = format_time(params[:restaurant]["#{day}_open"])
      close_time = format_time(params[:restaurant]["#{day}_close"])
      @restaurant.send("#{day}=", "#{open_time}#{close_time}") if open_time.present? && close_time.present?
    end
  end  
  
  def format_time(time_str)
    # Ensure the time is exactly four characters long (e.g., '0900' for 9 AM)
    Time.parse(time_str).strftime('%H%M') rescue ''
  end

  # Use callbacks to share common setup or constraints between actions.
  def set_restaurant
    @restaurant = Restaurant.find(params[:id])
  end

  # Only allow a list of trusted parameters through.
  def restaurant_params
    params.require(:restaurant).permit(:name, :address, :phone, :website, :cuisine, :price_range, :overall_rating, {images: []}, 
    :monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday)
  end

  def conditional_restaurant_params
    # Check if images are included in the form submission
    if params[:restaurant][:images].blank?
      # If no images are submitted, return parameters without the `images` key
      restaurant_params.except(:images)
    else
      # If images are submitted, return all parameters including `images`
      restaurant_params
    end
  end

end
