class AddCreatedByAndRequestedByToRestaurants < ActiveRecord::Migration[7.0]
  def change
    add_column :restaurants, :created_by, :string
    add_column :restaurants, :requested_by, :string
  end
end
