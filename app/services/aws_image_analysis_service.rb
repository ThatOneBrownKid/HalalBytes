

# AwsAnalysisService is a service class responsible for analyzing images and text using AWS Rekognition and Comprehend.
# It provides functionality to detect moderation labels in an image, determine if the image is safe for work, and analyze text for sentiment and toxic content.
#
# Example usage:
#   service = AwsAnalysisService.new
#   image_result = service.analyze_image(image_blob)
#   if image_result[:safe_for_work]
#     puts "Image is safe for work."
#   else
#     puts "Image is not safe for work."
#   end
#
#   text_result = service.analyze_text(text)
#   if text_result[:safe_content]
#     puts "Text is safe."
#   else
#     puts "Text contains toxic content."
#   end
#
# The service requires AWS credentials to be set in the environment variables:
# - AWS_REGION: The AWS region (default is 'us-east-1').
# - AWS_ACCESS_KEY_ID: The AWS access key ID.
# - AWS_SECRET_ACCESS_KEY: The AWS secret access key.
# - AWS_SESSION_TOKEN: (Optional) The AWS session token.
class AwsAnalysisService
  def initialize
    credentials = {
      region: ENV['AWS_REGION'] || 'us-east-1',
      access_key_id: ENV['AWS_ACCESS_KEY_ID'],
      secret_access_key: ENV['AWS_SECRET_ACCESS_KEY']
    }
    
    credentials[:session_token] = ENV['AWS_SESSION_TOKEN'] if ENV['AWS_SESSION_TOKEN']
    
    @rekognition_client = Aws::Rekognition::Client.new(credentials)
    @comprehend_client = Aws::Comprehend::Client.new(credentials)
  rescue => e
    Rails.logger.error "AWS initialization error: #{e.message}"
    raise
  end

  def analyze_image(image_blob)
    response = @rekognition_client.detect_moderation_labels(
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

  def analyze_text(text)
    return nil if text.blank?

    sentiment = @comprehend_client.detect_sentiment(
      text: text,
      language_code: 'en'
    )

    toxic_content = @comprehend_client.detect_toxic_content(
      text: text,
      language_code: 'en'
    )

    {
      sentiment: {
        label: sentiment.sentiment.downcase,
        score: sentiment.sentiment_score
      },
      content_warnings: extract_warnings(text, toxic_content.toxic_spans),
      safe_content: toxic_content.toxic_spans.empty?
    }
  rescue Aws::Comprehend::Errors::ServiceError => e
    Rails.logger.error "AWS Comprehend error: #{e.message}"
    { error: 'Text analysis failed', safe_content: false }
  end

  private

  def safe_for_work?(labels)
    unsafe_categories = [
      'Explicit', 
      'Non-Explicit Nudity of Intimate parts and Kissing',
      'Violence',
      'Swimwear or Underwear',
      'Visually Disturbing',
      'Drugs & Tobacco',
      'Alcohol',
      'Hate Symbols',
      'Suggestive'
    ]
    labels.none? { |label| unsafe_categories.include?(label.name) }
  end

  def extract_warnings(text, toxic_spans)
    toxic_spans.map do |span|
      {
        category: span.toxic_category,
        score: span.score,
        text: text[span.begin_offset...span.end_offset]
      }
    end
  end
end