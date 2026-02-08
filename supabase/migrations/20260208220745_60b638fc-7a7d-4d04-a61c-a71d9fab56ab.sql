-- Insert profile for the existing user
INSERT INTO profiles (user_id, full_name, email, is_active) 
VALUES ('f7dd4924-1b2f-4ff4-b63b-50043cd9eb6d', 'Castelo da Diversão', 'castelodadiversao@gmail.com', true)
ON CONFLICT (user_id) DO NOTHING;

-- Insert admin role for the user
INSERT INTO user_roles (user_id, role) 
VALUES ('f7dd4924-1b2f-4ff4-b63b-50043cd9eb6d', 'admin')
ON CONFLICT (user_id) DO NOTHING;