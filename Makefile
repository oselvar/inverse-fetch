ASSEMBLIES = $(wildcard assemblies/*.txt)
SVGS       = $(patsubst assemblies/%.txt,assemblies/%.svg,$(ASSEMBLIES))
PNGS       = $(patsubst assemblies/%.svg,assemblies/%.png,$(SVGS))

pngs: $(PNGS)
.PHONY: pngs

.PRECIOUS: assemblies/%.svg

assemblies/%.svg: assemblies/%.txt
	mkdir -p $(@D)
	npx assembly-diagrams $< --stroke-width 16 > $@

assemblies/%.png: assemblies/%.svg
	mkdir -p $(@D)
	rsvg-convert --width 256 $< -o $@

clean:
	rm -rf assemblies/*.svg assemblies/*.png
.PHONY: clean