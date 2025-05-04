# AwsImageAnalysisService is a service class responsible for analyzing images using AWS Rekognition.
# It provides functionality to detect moderation labels in an image and determine if the image is safe for work.
#
# Example usage:
#   service = AwsImageAnalysisService.new
#   result = service.analyze_image(image_blob)
#   if result[:safe_for_work]
#     puts "Image is safe for work."
#   else
#     puts "Image is not safe for work."
#   end
#
# The service requires AWS credentials to be set in the environment variables:
# - AWS_REGION: The AWS region (default is 'us-east-1').
# - AWS_ACCESS_KEY_ID: The AWS access key ID.
# - AWS_SECRET_ACCESS_KEY: The AWS secret access key.
# - AWS_SESSION_TOKEN: (Optional) The AWS session token.
class AwsImageAnalysisService
  
  def initialize
    
    credentials = {
      region: ENV['AWS_REGION'] || 'us-east-1',
      access_key_id: ENV['AWS_ACCESS_KEY_ID'],
      secret_access_key: ENV['AWS_SECRET_ACCESS_KEY']
    }
    
    # Add session token if present
    credentials[:session_token] = ENV['AWS_SESSION_TOKEN'] if ENV['AWS_SESSION_TOKEN']
    
    @client = Aws::Rekognition::Client.new(credentials)
   
  rescue => e
    raise
  end

  def analyze_image(image_blob)
   
    response = @client.detect_moderation_labels(
      image: {
        bytes: image_blob.download
      },
      min_confidence: 60
    )

    
    {
      safe_for_work: safe_for_work?(response.moderation_labels),
      labels: response.moderation_labels.map(&:name)
    }
  rescue Aws::Rekognition::Errors::ServiceError => e
    Rails.logger.error "AWS Rekognition error: #{e.message}"
    { error: 'Image analysis failed', safe_for_work: false }
  end

  private

  def safe_for_work?(labels)
    # Check if any of the labels are in the unsafe categories
    unsafe_categories = ['Explicit', 'Non-Explicit Nudity of Intimate parts and Kissing','Violence','Swimwear or Underwear','Visually Disturbing','Drugs & Tobacco','Alcohol','Hate Symbols','Suggestive']
    labels.none? { |label| unsafe_categories.include?(label.name) }
  end
end