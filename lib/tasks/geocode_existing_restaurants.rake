namespace :restaurants do
    desc "Geocode all restaurants without coordinates"
    task geocode_existing: :environment do
      Restaurant.find_each do |restaurant|
        if restaurant.latitude.nil? || restaurant.longitude.nil?
          restaurant.geocode
          if restaurant.save
            puts "Updated restaurant #{restaurant.id}"
          else
            Rails.logger.error "Failed to save restaurant #{restaurant.id}: #{restaurant.errors.full_messages.join(', ')}"
          end
        end
      end
      puts "Geocoding complete."
    end
  end
  