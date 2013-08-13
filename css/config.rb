# Require any additional compass plugins here.
# Set this to the root of your project when deployed:
http_path = ""
css_dir = ""
sass_dir = "src"
images_dir = "../i"
http_images_path = "/i"
javascripts_dir = "../js"
http_javascripts_path = "js"

#lets enable the sass debug info
sass_options = {:debug_info => false, :quiet => true}

#options for output_style: ":nested", ":expanded", ":compact", ":compressed"
output_style = :compressed

#kill the built in cache buster
asset_cache_buster :none

#this will define the absolute path to images referenced in the stylesheets
asset_host do |asset|
  "http://webapps.dev.city.ac.uk/service-desk-student/"
end
