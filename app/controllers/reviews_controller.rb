class ReviewsController < ApplicationController
  before_action :set_restaurant
  before_action :set_review, only: %i[show edit update destroy]

  # GET /restaurants/:restaurant_id/reviews
  def index
    @reviews = @restaurant.reviews
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
    @review.user = current_user

    # Check text content before saving
    analysis_service = AwsAnalysisService.new
    text_analysis = analysis_service.analyze_text(@review.content)

    respond_to do |format|
      if !text_analysis[:safe_content]
        @review.errors.add(:content, "contains inappropriate content")
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: { error: "Inappropriate content detected", warnings: text_analysis[:content_warnings] }, status: :unprocessable_entity }
      elsif @review.save
        format.html { redirect_to restaurant_path(@restaurant) }
        format.json { render :show, status: :created, location: @review }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @review.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /restaurants/:restaurant_id/reviews/1
  def update
    analysis_service = AwsAnalysisService.new
    text_analysis = analysis_service.analyze_text(review_params[:content])

    respond_to do |format|
      if !text_analysis[:safe_content]
        @review.errors.add(:content, "contains inappropriate content")
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { error: "Inappropriate content detected", warnings: text_analysis[:content_warnings] }, status: :unprocessable_entity }
      elsif @review.update(review_params)
        format.html { redirect_to restaurant_review_path(@restaurant, @review) }
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
    """ Handles the upload of an image, performs content moderation, and stores the image if deemed appropriate.
    
    It uses an external service (`AwsImageAnalysisService`) to analyze the image for inappropriate content."""

   if params[:image]
      
      # First analyze the image
      analysis_service = AwsAnalysisService.new
      
      begin
        analysis_result = analysis_service.analyze_image(params[:image])

        unless analysis_result[:safe_for_work]
          render json: { error: 'Image content not appropriate' }, status: :unprocessable_entity
          return
        end

        # If image is safe, proceed with upload
        uploaded_image = ActiveStorage::Blob.create_and_upload!(
          io: params[:image],
          filename: params[:image].original_filename,
          content_type: params[:image].content_type
        )

        #Store analysis results as metadata
        uploaded_image.metadata = uploaded_image.metadata.merge(
          moderation_labels: analysis_result[:labels]
        )
        uploaded_image.save!
#
        image_url = url_for(uploaded_image)
        
        render json: { url: image_url }, status: :ok
      rescue => e
        render json: { error: "Upload failed: #{e.message}" }, status: :unprocessable_entity
      end
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
