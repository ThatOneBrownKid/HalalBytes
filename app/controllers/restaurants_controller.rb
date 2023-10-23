require 'nokogiri'
require 'open-uri'

class RestaurantsController < ApplicationController
  before_action :set_restaurant, only: %i[ show edit update destroy ]

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

  # POST /restaurants or /restaurants.json
  def create
    @restaurant = Restaurant.new(restaurant_params)
    respond_to do |format|
      if @restaurant.save
        format.html { redirect_to restaurant_url(@restaurant), notice: "Restaurant was successfully created." }
        format.json { render :show, status: :created, location: @restaurant }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @restaurant.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /restaurants/1 or /restaurants/1.json
  def update
    respond_to do |format|
      if @restaurant.update(restaurant_params)
        format.html { redirect_to restaurant_url(@restaurant), notice: "Restaurant was successfully updated." }
        format.json { render :show, status: :ok, location: @restaurant }
      else
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
    @restaurant.destroy

    respond_to do |format|
      format.html { redirect_to restaurants_url, notice: "Restaurant was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_restaurant
      @restaurant = Restaurant.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def restaurant_params
      params.require(:restaurant).permit(:name, :address, :phone, :website, :cuisine, :price_range, :overall_rating, images: [])
    end
end
