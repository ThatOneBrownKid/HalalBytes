class ReviewsController < ApplicationController
  before_action :set_restaurant
  before_action :set_review, only: %i[show edit update destroy]

  # GET /restaurants/:restaurant_id/reviews
  def index
    sort = params[:sort]

    @reviews = case sort
               when 'newest'
                 @restaurant.reviews.order(created_at: :desc)
               when 'oldest'
                 @restaurant.reviews.order(created_at: :asc)
               when 'highest_rating'
                 @restaurant.reviews.order(rating: :desc)
               when 'lowest_rating'
                 @restaurant.reviews.order(rating: :asc)
               else
                 @restaurant.reviews.order(created_at: :desc) # Default: newest first
               end
  end

  # GET /restaurants/:restaurant_id/reviews/1
  def show
  end

  # GET /restaurants/:restaurant_id/reviews/new
  def new
    @review = @restaurant.reviews.new
  end

  # GET /restaurants/:restaurant_id/reviews/1/edit
  def edit
  end

  # POST /restaurants/:restaurant_id/reviews
  def create
    @review = @restaurant.reviews.new(review_params)
    @review.user = current_user # Automatically associate logged-in user
  
    respond_to do |format|
      if @review.save
        format.html { redirect_to restaurant_path(@restaurant)}
        format.json { render :show, status: :created, location: @review }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @review.errors, status: :unprocessable_entity }
      end
    end
  end
  

  # PATCH/PUT /restaurants/:restaurant_id/reviews/1
  def update
    respond_to do |format|
      if @review.update(review_params)
        format.html { redirect_to restaurant_review_path(@restaurant, @review)}
        format.json { render :show, status: :ok, location: @review }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @review.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /restaurants/:restaurant_id/reviews/1
  def destroy
    @review.destroy

    respond_to do |format|
      # Changed redirect to go to the parent restaurant's show page
      format.html { redirect_to restaurant_path(@restaurant)}
      format.json { head :no_content }
    end
  end

  def upload_image
    if params[:image]
      # Attach the image to a temporary ActiveStorage blob
      uploaded_image = ActiveStorage::Blob.create_and_upload!(
        io: params[:image],
        filename: params[:image].original_filename,
        content_type: params[:image].content_type
      )

      # Generate the URL for the uploaded image
      image_url = url_for(uploaded_image)

      # Return the image URL as JSON
      render json: { url: image_url }, status: :ok
    else
      render json: { error: "No image provided" }, status: :unprocessable_entity
    end
  end

  private

  # Find the associated restaurant for the nested routes
  def set_restaurant
    @restaurant = Restaurant.find(params[:restaurant_id])
  end

  # Find the specific review for actions like show, edit, update, and destroy
  def set_review
    @review = @restaurant.reviews.find(params[:id])
  end

  # Permit the allowed parameters for creating/updating reviews
  def review_params
    params.require(:review).permit(:content, :rating, :parent_id, images: [])
  end
end
