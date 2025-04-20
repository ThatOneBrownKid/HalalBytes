class CreateReviews < ActiveRecord::Migration[7.0]
  def change
    create_table :reviews do |t|
      t.references :restaurant, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.text :content
      t.integer :likes
      t.integer :rating
      t.integer :parent_id

      t.timestamps
    end
  end
end
