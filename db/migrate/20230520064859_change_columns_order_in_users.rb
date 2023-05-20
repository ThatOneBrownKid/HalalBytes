class ChangeColumnsOrderInUsers < ActiveRecord::Migration[7.0]
  def change
    change_table :users do |t|
      t.change :email, :string, after: :id
      t.change :first_name, :string, after: :email
      t.change :last_name, :string, after: :first_name
      t.change :admin, :boolean, after: :last_name
  end
end
end
