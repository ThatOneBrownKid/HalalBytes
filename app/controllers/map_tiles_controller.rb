require 'net/http'
require_relative '../../.api_key.rb'
class MapTilesController < ApplicationController
  def show
    z = params[:z].to_i  # Convert zoom level to integer for better handling
    x = params[:x].to_i  # Convert tile x-coordinate to integer
    y = params[:y].to_i  # Convert tile y-coordinate to integer
    cache_key = "#{z}_#{x}_#{y}"

    # Attempt to fetch the tile from the cache
    cached_tile = Rails.cache.read(cache_key)
    if cached_tile
      Rails.logger.info "Serving cached tile #{cache_key} (zoom: #{z})"
      send_data cached_tile, type: 'image/png', disposition: 'inline', stream: true
    else
      # Tile is not in the cache, fetch it from Geoapify and cache it based on zoom level
      fetch_and_cache_tile(z, x, y, cache_key)
    end
  end

  private

  def fetch_and_cache_tile(z, x, y, cache_key)
    url = URI("https://maps.geoapify.com/v1/tile/maptiler-3d/#{z}/#{x}/#{y}.png?apiKey=#{$geoapify_api_key}")
    response = Net::HTTP.get_response(url)

    if response.is_a?(Net::HTTPSuccess)
      # Cache the tile for the specific zoom level
      cache_expiry = determine_cache_expiry(z)
      Rails.cache.write(cache_key, response.body, expires_in: cache_expiry) 
      Rails.logger.info "Fetched and cached tile #{cache_key} (zoom: #{z}) with expiry: #{cache_expiry} seconds"
      send_data response.body, type: 'image/png', disposition: 'inline'
    else
      # Log error and provide a meaningful message if something goes wrong
      Rails.logger.error "Failed to fetch tile #{cache_key} from Geoapify. Response code: #{response.code}"
      render plain: "Error fetching map tile (Geoapify error: #{response.code})", status: :bad_request
    end
  end

  # Determine cache expiry based on zoom level
  def determine_cache_expiry(z)
    case z
    when 0..5
      1.day # Long cache time for low zoom levels
    when 6..10
      12.hours # Medium cache time for mid-range zoom levels
    else
      6.hours # Shorter cache time for high zoom levels
    end
  end
end