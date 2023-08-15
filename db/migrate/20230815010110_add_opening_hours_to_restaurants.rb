class AddOpeningHoursToRestaurants < ActiveRecord::Migration[7.0]
  def change
    add_column :restaurants, :monday, :string, default: nil
    add_column :restaurants, :tuesday, :string, default: nil
    add_column :restaurants, :wednesday, :string, default: nil
    add_column :restaurants, :thursday, :string, default: nil
    add_column :restaurants, :friday, :string, default: nil
    add_column :restaurants, :saturday, :string, default: nil
    add_column :restaurants, :sunday, :string, default: nil
  end
end
