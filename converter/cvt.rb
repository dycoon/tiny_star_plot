
require "json"

s = ""

File.open("hip_main.dat", "rb") do |f|
  s = f.read
end

s = s.split "\n"

ns = []
s.each { |sa|
  a = sa.split "|"
  na = {}
  na[:id] = a[1].to_i
  ra = a[3].split(" ")
  na[:ra] = (ra[0].to_i * 60 * 60 + ra[1].to_i * 60 + ra[2].to_i) * 2.0 * Math::PI / (24 * 60 * 60)
  de = a[4].split(" ")

  na[:de] = (de[0].to_i.abs + de[1].to_i / 60.0 + de[2].to_f / 60.0 / 60.0) * 2.0 * Math::PI / (360.0)
  na[:de] *= -1 if de[0].include? "-"
  #na[:de2] = a[9].to_f * 2.0 * Math::PI / 360.0
  na[:b] = a[5].to_f

  #print "#{na[:id]} #{na[:de]} #{na[:de2]}\n" if (na[:de] - na[:de2]).abs > 1
  #print "#{na[:id]} #{na[:de]} #{na[:de2]} #{na[:b]}\n" if na[:de].abs < 0.01 && na[:b] < 3.0
  ns.push na
}

ns = ns.sort {|a, b|
  a[:b] <=> b[:b]
}

ns = ns.slice(0...5000)

txt = ns.to_json.gsub("},{", "},\n{")

#print txt

File.open("../html/star_catalogue.js", "wt") do |f|
  f.write <<EOS
// converted from Hipparcos Catalogue
// http://www.rssd.esa.int/index.php?page=Overview&project=HIPPARCOS
starCatalogue = #{txt}
EOS
end

