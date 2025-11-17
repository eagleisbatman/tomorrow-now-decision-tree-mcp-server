-- Decision Tree MCP Server Database Schema
-- PostgreSQL schema for storing crop decision trees

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crops table
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  scientific_name VARCHAR(200),
  base_temp_celsius DECIMAL(4,1) NOT NULL,
  cap_temp_celsius DECIMAL(4,1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Growth stages table
CREATE TABLE growth_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  stage_name VARCHAR(100) NOT NULL,
  stage_order INTEGER NOT NULL,
  gdd_early_min INTEGER,
  gdd_early_max INTEGER,
  gdd_mid_min INTEGER,
  gdd_mid_max INTEGER,
  gdd_late_min INTEGER,
  gdd_late_max INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(crop_id, stage_order)
);

-- Decision tree rules table
CREATE TABLE decision_tree_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  growth_stage_id UUID NOT NULL REFERENCES growth_stages(id) ON DELETE CASCADE,
  parameter VARCHAR(50) NOT NULL, -- 'P/PET', 'Precipitation', 'Relative Humidity', 'Temperature'
  condition_type VARCHAR(20) NOT NULL, -- 'low', 'optimal', 'high'
  units VARCHAR(20) NOT NULL, -- 'mm/mm', 'mm', '%', 'oC'
  range_min VARCHAR(50), -- e.g., '0-0.5', '0-5mm', '10-15°C'
  range_max VARCHAR(50),
  message_english TEXT NOT NULL,
  message_length INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GDD configurations per crop variety type
CREATE TABLE gdd_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  variety_type VARCHAR(50) NOT NULL, -- 'Early', 'Mid', 'Late'
  growth_stage_id UUID NOT NULL REFERENCES growth_stages(id) ON DELETE CASCADE,
  gdd_min INTEGER NOT NULL,
  gdd_max INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(crop_id, variety_type, growth_stage_id)
);

-- Indexes for performance
CREATE INDEX idx_decision_rules_crop_stage ON decision_tree_rules(crop_id, growth_stage_id);
CREATE INDEX idx_decision_rules_parameter ON decision_tree_rules(parameter);
CREATE INDEX idx_growth_stages_crop ON growth_stages(crop_id);
CREATE INDEX idx_gdd_configs_crop_variety ON gdd_configs(crop_id, variety_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON crops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decision_rules_updated_at BEFORE UPDATE ON decision_tree_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

