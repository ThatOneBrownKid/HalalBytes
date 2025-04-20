class RestaurantsController < ApplicationController
  before_action :set_restaurant, only: [:show, :edit, :update, :destroy]
  skip_before_action :set_restaurant, only: [:request_new, :request_create]
  include RestaurantsHelper
  require 'set'
  # GET /restaurants or /restaurants.json
  def index
      @geoapify_api_key = ENV['GEOAPIFY_API_KEY']
      @restaurants = Restaurant.all
  end

  # GET /restaurants/filter
  def filter
    @restaurants = Restaurant.filtered_results(params)
    @restaurants = @restaurants.where(latitude: params[:southWestlat]..params[:northEastlat], longitude: params[:southWestlng]..params[:northEastlng])
    
    if @restaurants.empty?
      respond_to do |format|
        format.html { render 'restaurants/partials/no_stores', layout: false }  # Render 'no_stores' if no restaurants found
        format.json { render json: [], status: :ok }
      end
      return
    end

    @data = @restaurants.select(:id, :name, :street, :latitude, :longitude)

    respond_to do |format|
      format.html { render partial: 'restaurants/partials/restaurant', collection: @restaurants, as: :restaurant }
      format.json { render json: @data }
    end
  end

  # GET /restaurants/1 or /restaurants/1.json
  def show
    @restaurant = Restaurant.find(params[:id])
    @ordered_images = @restaurant.ordered_images

    # Collect images from all reviews
    review_images = []
    @restaurant.reviews.includes(:images_attachments).each do |review|
      review_images.concat(review.images.attachments)
    end

    # Combine restaurant's ordered images with review images
    @all_gallery_images = @ordered_images + review_images

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
    @restaurant.notes = params[:restaurant][:notes]&.join(';') if params[:restaurant][:halal_status] == 'Partially Halal'
    process_operating_times
    @restaurant.requested_by = "#{current_user.first_name}_#{current_user.last_name}_#{current_user.id}"
    @restaurant.keep = false
    @restaurant.created_by = nil
    @restaurant.overall_rating = 0 

    # Geocode the address
    @restaurant.geocode # Ensure this method exists and is called to set latitude and longitude

    # Check if latitude or longitude is nil
    if @restaurant.latitude.nil? || @restaurant.longitude.nil?
      @restaurant.errors.add(:address, "couldn't be recognized")
    end

    # Check for duplicate restaurant (name + address combination)
    duplicate = Restaurant.find_by(name: @restaurant.name, street: @restaurant.street, city: @restaurant.city, state: @restaurant.state, zip_code: @restaurant.zip_code)
    if duplicate.present?
      @restaurant.errors.add(:base, "A restaurant with this name and address already exists.")
    end

    respond_to do |format|
      if @restaurant.errors.any?
        flash.now[:alert] = @restaurant.errors.full_messages.join(', ')
        format.html { render :request_new, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      elsif @restaurant.save
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
    @restaurant.notes = params[:restaurant][:notes]&.join(';') if params[:restaurant][:halal_status] == 'Partially Halal'
    process_operating_times
    if user_signed_in?
      @restaurant.created_by = "#{current_user.first_name}_#{current_user.last_name}_#{current_user.id}"
    end

    # Geocode the address
    @restaurant.geocode # Ensure this method exists and is called to set latitude and longitude

    # Check if latitude or longitude is nil
    if @restaurant.latitude.nil? || @restaurant.longitude.nil?
      @restaurant.errors.add(:address, "couldn't be recognized test.")
    end

    # Check for duplicate restaurant (name + address combination)
    duplicate = Restaurant.find_by(name: @restaurant.name, street: @restaurant.street, city: @restaurant.city, state: @restaurant.state, zip_code: @restaurant.zip_code)
    if duplicate.present?
      @restaurant.errors.add(:base, "A restaurant with this name and address already exists.")
    end

    respond_to do |format|
      if @restaurant.errors.any?
        flash.now[:alert] = @restaurant.errors.full_messages.join(', ')
        format.html { render :request_new, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      elsif @restaurant.save
        format.html { redirect_to restaurant_url(@restaurant), notice: "The restaurant has been created." }
        format.json { render :show, status: :created, location: @restaurant }
      else
        flash.now[:alert] = @restaurant.errors.full_messages.join(', ')
        format.html { render :request_new, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /restaurants/1 or /restaurants/1.json
  def update
    process_operating_times
    @restaurant.images.attach(params[:restaurant][:images]) if params[:restaurant][:images].present?
    @restaurant.notes = params[:restaurant][:notes]&.join(';') if params[:restaurant][:halal_status] == 'Partially Halal'
  
    # Geocode the address if it has changed
    if address_changed?(restaurant_params)
      @restaurant.geocode
  
      # Check if latitude or longitude is nil
      if @restaurant.latitude.nil? || @restaurant.longitude.nil?
        @restaurant.errors.add(:address, "couldn't be recognized.")
      end
    end
  
    # Check for duplicate restaurant (name + address combination)
    duplicate = Restaurant.where.not(id: @restaurant.id).find_by(
      name: restaurant_params[:name],
      street: restaurant_params[:street],
      city: restaurant_params[:city],
      state: restaurant_params[:state],
      zip_code: restaurant_params[:zip_code]
    )
    if duplicate.present?
      @restaurant.errors.add(:base, "A restaurant with this name and address already exists.")
    end
  
    respond_to do |format|
      if @restaurant.errors.any?
        flash.now[:alert] = @restaurant.errors.full_messages.join(', ')
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      elsif @restaurant.update(restaurant_params)
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
      # Only update if both times are present and correctly formatted
      if open_time.present? && close_time.present? && open_time.length == 4 && close_time.length == 4
        @restaurant.send("#{day}=", "#{open_time}#{close_time}")
      end
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
    params.require(:restaurant).permit(:id,:name, :phone, :website, :cuisine, :price_range, :overall_rating, {images: []}, 
    :monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday, :street, :city, :state, :zip_code, :halal_status, :notes, :longitude, :latitude)
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

  def address_changed?(params)
    %i[street city state zip_code].any? do |attribute|
      @restaurant.send(attribute) != params[attribute]
    end
  end

end
