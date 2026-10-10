// Generated from KianMacro.java (recorded in STAR-CCM+ 21.04.008).
// Inputs are SI units. The source geometry is NOT scaled or moved.
// Airflow -X: inlet +X, outlet -X; drag -X; downforce -Z.
// Reference length = 0.8 m; base = 0.5 m; speed = 9.0 m/s.
// Simcenter STAR-CCM+ macro: KianMacro.java
// Written by Simcenter STAR-CCM+ 21.04.008
package macro;

import java.util.*;

import star.common.*;
import star.base.neo.*;
import star.segregatedflow.*;
import star.material.*;
import star.base.report.*;
import star.turbulence.*;
import star.vis.*;
import star.flow.*;
import star.kwturb.*;
import star.metrics.*;
import star.meshing.*;
import star.trimmer.*;
import star.prismmesher.*;
import star.resurfacer.*;

public class ConfiguredMacro extends StarMacro {

  @Override
  public void execute() {
    try {
      execute0();
    } catch (Exception error) {
      throw new RuntimeException("Macro setup failed. The simulation may be partially modified. "
          + "Reopen your saved imported-only simulation before retrying. " + error.getMessage(), error);
    }
  }

  private void execute0() {

    Simulation simulation_0 = 
      getActiveSimulation();

    // This setup macro is intentionally single-use in an imported-only simulation.
    if (!simulation_0.getRegionManager().getRegions().isEmpty())
      throw new IllegalStateException("Start from a saved simulation with imported geometry and no regions.");
    GeometryPart selectedPart = simulation_0.get(SimulationPartManager.class).getPart("Part 6__Part 6");
    if (!(selectedPart instanceof CadPart))
      throw new IllegalStateException("Select an imported CAD part (for example STEP), not a mesh/STL or assembly.");
    CadPart cadPart_0 = (CadPart) selectedPart;
    List<PartSurface> originalSurfaces = new ArrayList<>(cadPart_0.getPartSurfaceManager().getPartSurfaces());
    if (originalSurfaces.isEmpty()) throw new IllegalStateException("Selected part has no surfaces.");
    for (PartSurface surface : originalSurfaces)
      if (surface.getPresentationName().startsWith("KM_"))
        throw new IllegalStateException("Source surface names beginning KM_ are reserved; rename them before playback.");
    for (GeometryPart p : simulation_0.get(SimulationPartManager.class).getParts()) {
      if (p.getPresentationName().startsWith("KM_"))
        throw new IllegalStateException("A KM_ part already exists. Reopen the imported-only simulation.");
    }

    Units units_0 = 
      ((Units) simulation_0.getUnitsManager().getObject("m"));

    MeshPartFactory meshPartFactory_0 = 
      simulation_0.get(MeshPartFactory.class);

    SimpleBlockPart simpleBlockPart_0 = 
      meshPartFactory_0.createNewBlockPart(simulation_0.get(SimulationPartManager.class));

    simpleBlockPart_0.setPresentationName("KM_Domain");
    simpleBlockPart_0.setDoNotRetessellate(true);

    LabCoordinateSystem labCoordinateSystem_0 = 
      simulation_0.getCoordinateSystemManager().getLabCoordinateSystem();

    simpleBlockPart_0.setCoordinateSystem(labCoordinateSystem_0);

    simpleBlockPart_0.getCorner1().setCoordinateSystem(labCoordinateSystem_0);

    simpleBlockPart_0.getCorner1().setCoordinate(units_0, units_0, units_0, new DoubleVector(new double[] {-8.3, -4.4, -4.1}));

    simpleBlockPart_0.getCorner2().setCoordinateSystem(labCoordinateSystem_0);

    simpleBlockPart_0.getCorner2().setCoordinate(units_0, units_0, units_0, new DoubleVector(new double[] {4.3, 4.4, 4.1}));

    simpleBlockPart_0.rebuildSimpleShapePart();

    simpleBlockPart_0.setDoNotRetessellate(false);

    MeshActionManager meshActionManager_0 = 
      simulation_0.get(MeshActionManager.class);

    // Split the primitive BEFORE subtraction, using geometric face IDs, never recorded IDs.
    PartSurface blockSurface = simpleBlockPart_0.getPartSurfaceManager().getPartSurface("Block Surface");
    simpleBlockPart_0.splitPartSurfaceByPatch(blockSurface,
        new IntVector(new int[] {simpleBlockPart_0.getMaxXFace()}), "KM_Inlet");
    simpleBlockPart_0.splitPartSurfaceByPatch(blockSurface,
        new IntVector(new int[] {simpleBlockPart_0.getMinXFace()}), "KM_Outlet");
    blockSurface.setPresentationName("KM_Farfield");

    // Tag all body surfaces so no arbitrary CAD name is mistaken for the enclosure.
    // Restore source names even if the boolean operation fails.
    Map<String, String> bodyLabels = new LinkedHashMap<>();
    List<String> oldNames = new ArrayList<>();
    for (PartSurface surface : originalSurfaces) oldNames.add(surface.getPresentationName());
    MeshPart meshPart_0;
    try {
      for (int i = 0; i < originalSurfaces.size(); i++) {
        String tag = "KM_Body_" + i;
        bodyLabels.put(tag, oldNames.get(i));
        originalSurfaces.get(i).setPresentationName(tag);
      }
      meshPart_0 = meshActionManager_0.subtractParts(
          new ArrayList<>(Arrays.<MeshPart>asList(simpleBlockPart_0, cadPart_0)), simpleBlockPart_0, "Discrete");
    } finally {
      for (int i = 0; i < originalSurfaces.size(); i++) originalSurfaces.get(i).setPresentationName(oldNames.get(i));
    }
    meshPart_0.setPresentationName("KM_Fluid");
    Set<String> expected = new LinkedHashSet<>(bodyLabels.keySet());
    expected.add("KM_Inlet"); expected.add("KM_Outlet"); expected.add("KM_Farfield");
    Set<String> found = new HashSet<>();
    for (PartSurface surface : meshPart_0.getPartSurfaceManager().getPartSurfaces()) {
      String tag = surfaceTag(surface.getPresentationName(), expected);
      if (tag == null || !found.add(tag))
        throw new IllegalStateException("Cannot identify boolean surface: " + surface.getPresentationName());
      surface.setPresentationName(tag);
    }
    if (!found.containsAll(expected))
      throw new IllegalStateException("Boolean output is missing expected faces. Check a closed, valid CAD part fully inside the box.");

    Region region_0 = 
      simulation_0.getRegionManager().createEmptyRegion(null);

    region_0.setPresentationName("KM_Fluid");

    Boundary boundary_0 = 
      region_0.getBoundaryManager().getBoundary("Default");

    region_0.getBoundaryManager().removeObjects(boundary_0);

    simulation_0.getRegionManager().newRegionsFromParts(new ArrayList<>(Arrays.<GeometryPart>asList(meshPart_0)), "OneRegion", region_0, "OneBoundaryPerPartSurface", null, RegionManager.CreateInterfaceMode.BOUNDARY, "OneEdgeBoundaryPerPart", null);

    PhysicsContinuum physicsContinuum_0 = 
      simulation_0.getContinuumManager().createContinuum(PhysicsContinuum.class);

    physicsContinuum_0.enable(SingleComponentGasModel.class);

    physicsContinuum_0.enable(SegregatedFlowModel.class);

    physicsContinuum_0.enable(ThreeDimensionalModel.class);

    physicsContinuum_0.enable(SteadyModel.class);

    physicsContinuum_0.enable(ConstantDensityModel.class);

    physicsContinuum_0.enable(TurbulentModel.class);

    physicsContinuum_0.enable(RansTurbulenceModel.class);

    physicsContinuum_0.enable(KOmegaTurbulence.class);

    physicsContinuum_0.enable(SstKwTurbModel.class);

    physicsContinuum_0.enable(KwAllYplusWallTreatment.class);

    // test2.sim active physics has no Gamma-ReTheta transition model.

    region_0.setPhysicsContinuum(physicsContinuum_0);

    Units units_1 = 
      ((Units) simulation_0.getUnitsManager().getObject("Pa"));

    physicsContinuum_0.getReferenceValues().get(ReferencePressure.class).setValueAndUnits(101000.0, units_1);

    InitialPressureProfile initialPressureProfile_0 = 
      physicsContinuum_0.getInitialConditions().get(InitialPressureProfile.class);

    initialPressureProfile_0.getMethod(ConstantScalarProfileMethod.class).getQuantity().setValueAndUnits(0.0, units_1);

    VelocityProfile velocityProfile_0 = 
      physicsContinuum_0.getInitialConditions().get(VelocityProfile.class);

    Units units_2 = 
      ((Units) simulation_0.getUnitsManager().getObject("m/s"));

    velocityProfile_0.getMethod(ConstantVectorProfileMethod.class).getQuantity().setComponentsAndUnits(-9.0, 0.0, 0.0, units_2);

    Boundary boundary_1 = 
      findBoundary(region_0, "KM_Inlet");

    InletBoundary inletBoundary_0 = 
      ((InletBoundary) simulation_0.get(ConditionTypeManager.class).get(InletBoundary.class));

    boundary_1.setBoundaryType(inletBoundary_0);

    VelocityMagnitudeProfile velocityMagnitudeProfile_0 = 
      boundary_1.getValues().get(VelocityMagnitudeProfile.class);

    velocityMagnitudeProfile_0.getMethod(ConstantScalarProfileMethod.class).getQuantity().setValueAndUnits(9.0, units_2);

    Boundary boundary_2 = 
      findBoundary(region_0, "KM_Outlet");

    PressureBoundary pressureBoundary_0 = 
      ((PressureBoundary) simulation_0.get(ConditionTypeManager.class).get(PressureBoundary.class));

    boundary_2.setBoundaryType(pressureBoundary_0);

    StaticPressureProfile staticPressureProfile_0 = 
      boundary_2.getValues().get(StaticPressureProfile.class);

    staticPressureProfile_0.getMethod(ConstantScalarProfileMethod.class).getQuantity().setValueAndUnits(0.0, units_1);

    Boundary boundary_3 = 
      findBoundary(region_0, "KM_Farfield");

    boundary_3.getConditions().get(WallShearStressOption.class).setSelected(WallShearStressOption.Type.SLIP);

    AutoMeshOperation autoMeshOperation_0 = 
      simulation_0.get(MeshOperationManager.class).createAutoMeshOperation(new StringVector(new String[] {"star.trimmer.TrimmerAutoMesher", "star.resurfacer.ResurfacerAutoMesher", "star.prismmesher.PrismAutoMesher", "star.resurfacer.AutomaticSurfaceRepairAutoMesher"}), new ArrayList<>(Arrays.<GeometryPart>asList(meshPart_0)));

    autoMeshOperation_0.getDefaultValues().get(BaseSize.class).setValueAndUnits(0.5, units_0);

    // V2: settings recovered from test2.sim. Only the fluid part is a mesh input.
    // This second block is a sizing volume, never a solid obstacle or fluid region.
    SimpleBlockPart refinementBlock = meshPartFactory_0.createNewBlockPart(
        simulation_0.get(SimulationPartManager.class));
    refinementBlock.setPresentationName("KM_Refinement");
    refinementBlock.setDoNotRetessellate(true);
    refinementBlock.setCoordinateSystem(labCoordinateSystem_0);
    refinementBlock.getCorner1().setCoordinateSystem(labCoordinateSystem_0);
    refinementBlock.getCorner1().setCoordinate(units_0, units_0, units_0,
        new DoubleVector(new double[] {-0.3, -0.4, -0.1}));
    refinementBlock.getCorner2().setCoordinateSystem(labCoordinateSystem_0);
    refinementBlock.getCorner2().setCoordinate(units_0, units_0, units_0,
        new DoubleVector(new double[] {0.3, 0.4, 0.1}));
    refinementBlock.rebuildSimpleShapePart();
    refinementBlock.setDoNotRetessellate(false);

    PartsMinimumSurfaceSize minSize = autoMeshOperation_0.getDefaultValues().get(PartsMinimumSurfaceSize.class);
    minSize.getRelativeOrAbsoluteOption().setSelected(RelativeOrAbsoluteOption.Type.RELATIVE);
    minSize.getRelativeSizeScalar().setValue(10.0);
    PartsTargetSurfaceSize targetSize = autoMeshOperation_0.getDefaultValues().get(PartsTargetSurfaceSize.class);
    targetSize.getRelativeOrAbsoluteOption().setSelected(RelativeOrAbsoluteOption.Type.RELATIVE);
    targetSize.getRelativeSizeScalar().setValue(100.0);
    MaximumCellSize maxSize = autoMeshOperation_0.getDefaultValues().get(MaximumCellSize.class);
    maxSize.getRelativeOrAbsoluteOption().setSelected(RelativeOrAbsoluteOption.Type.RELATIVE);
    maxSize.getRelativeSizeScalar().setValue(10000.0);

    // Selection codes are read directly from the 21.04.008 save, not enum ordinals.
    PartsSimpleTemplateGrowthRate growth = autoMeshOperation_0.getDefaultValues().get(PartsSimpleTemplateGrowthRate.class);
    setSavedSelection(growth.getGrowthRateOption(), 3);
    setSavedSelection(growth.getSurfaceGrowthRateOption(), -1);
    autoMeshOperation_0.getDefaultValues().get(MaxTrimmerSizeToPrismThicknessRatio.class)
        .setLimitCellSizeByPrismThickness(false);

    PrismDefaultValuesManager prismDefaults = autoMeshOperation_0.getDefaultValues().get(PrismDefaultValuesManager.class);
    prismDefaults.get(NumPrismLayers.class).getNumLayersValue().getQuantity().setValue(2.0);
    PrismThickness thickness = prismDefaults.get(PrismThickness.class);
    thickness.getRelativeOrAbsoluteOption().setSelected(RelativeOrAbsoluteOption.Type.ABSOLUTE);
    thickness.getAbsoluteSize().getValue().setValueAndUnits(0.01, units_0);
    prismDefaults.get(PrismLayerStretching.class).getStretchingQuantity().setValue(1.5);

    VolumeCustomMeshControl refinement = autoMeshOperation_0.getCustomMeshControls().createVolumeControl();
    refinement.setPresentationName("KM_Body_Refinement");
    refinement.getGeometryObjects().setQuery(null);
    refinement.getGeometryObjects().setObjects(refinementBlock);
    refinement.getCustomConditions().get(VolumeControlResurfacerSizeOption.class).setVolumeControlBaseSizeOption(true);
    refinement.getCustomConditions().get(VolumeControlTrimmerSizeOption.class).setVolumeControlBaseSizeOption(true);
    VolumeControlSize refinementSize = refinement.getCustomValues().get(VolumeControlSize.class);
    refinementSize.getRelativeOrAbsoluteOption().setSelected(RelativeOrAbsoluteOption.Type.RELATIVE);
    refinementSize.getRelativeSizeScalar().setValue(2.0);

    // Explicit initial, inlet and outlet/backflow turbulence from test2.sim.
    setSavedSelection(physicsContinuum_0.getInitialConditions().get(KwTurbSpecOption.class), 2);
    physicsContinuum_0.getInitialConditions().get(TurbulenceIntensityProfile.class)
        .getMethod(ConstantScalarProfileMethod.class).getQuantity().setValue(0.01);
    physicsContinuum_0.getInitialConditions().get(TurbulentViscosityRatioProfile.class)
        .getMethod(ConstantScalarProfileMethod.class).getQuantity().setValue(10.0);
    for (Boundary flowBoundary : Arrays.asList(boundary_1, boundary_2)) {
      setSavedSelection(flowBoundary.getConditions().get(KwTurbSpecOption.class), 2);
      flowBoundary.getValues().get(TurbulenceIntensityProfile.class)
          .getMethod(ConstantScalarProfileMethod.class).getQuantity().setValue(0.01);
      flowBoundary.getValues().get(TurbulentViscosityRatioProfile.class)
          .getMethod(ConstantScalarProfileMethod.class).getQuantity().setValue(10.0);
    }
    simulation_0.println("V2 settings: trimmed mesh; refinement 2.0% base; no transition model.");

    // Leave mesh generation off by default so the user can inspect the setup.
    if (false) autoMeshOperation_0.execute();

    ForceReport forceReport_0 = 
      simulation_0.getReportManager().create("star.flow.ForceReport");

    Units units_3 = 
      ((Units) simulation_0.getUnitsManager().getObject(""));

    forceReport_0.getDirection().setComponentsAndUnits(-1.0, 0.0, 0.0, units_3);

    forceReport_0.getReferencePressure().setValueAndUnits(0.0, units_1);

    forceReport_0.getParts().setQuery(null);

    List<Boundary> bodyBoundaries = new ArrayList<>();
    for (String tag : bodyLabels.keySet()) {
      Boundary body = findBoundary(region_0, tag);
      bodyBoundaries.add(body);
      simulation_0.println("Body surface: " + tag + " = " + bodyLabels.get(tag));
    }
    if (bodyBoundaries.isEmpty()) throw new IllegalStateException("No body boundaries found.");

    forceReport_0.getParts().setObjects(bodyBoundaries.toArray(new Boundary[0]));

    forceReport_0.setPresentationName("Drag");

    ForceReport forceReport_1 = 
      simulation_0.getReportManager().create("star.flow.ForceReport");

    forceReport_1.getDirection().setComponentsAndUnits(0.0, 0.0, -1.0, units_3);

    forceReport_1.getReferencePressure().setValueAndUnits(0.0, units_1);

    forceReport_1.getParts().setQuery(null);

    forceReport_1.getParts().setObjects(bodyBoundaries.toArray(new Boundary[0]));

    forceReport_1.setPresentationName("Downforce");

    simulation_0.getMonitorManager().createMonitors(new ArrayList<>(Arrays.<Report>asList(forceReport_1, forceReport_0)), new PlotCreationInfo(PlotCreationInfo.CreatePlotChoice.SINGLE_PLOT, "Reports Plot"));

    Cartesian2DPlot cartesian2DPlot_0 = 
      ((Cartesian2DPlot) simulation_0.getPlotManager().getPlot("Reports Plot"));

    cartesian2DPlot_0.openInteractive();

    Set<Scene> oldScenes = new HashSet<>(simulation_0.getSceneManager().getScenes());
    simulation_0.getSceneManager().createScalarScene("Scalar Scene", "Outline", "Scalar", null);

    Scene scene_1 = null;
    for (Scene candidate : simulation_0.getSceneManager().getScenes())
      if (!oldScenes.contains(candidate)) scene_1 = candidate;
    if (scene_1 == null) throw new IllegalStateException("Pressure scene was not created.");
    scene_1.setPresentationName("KM_Pressure_and_Streamlines");

    ScalarDisplayer scalarDisplayer_0 = 
      ((ScalarDisplayer) scene_1.getDisplayerManager().getObject("Scalar 1"));

    scalarDisplayer_0.getInputParts().setQuery(null);

    scalarDisplayer_0.getInputParts().setObjects(bodyBoundaries.toArray(new Boundary[0]));

    Legend legend_0 = 
      scalarDisplayer_0.getLegend();

    legend_0.updateLayout(new DoubleVector(new double[] {0.73, 0.08}), 0.19999999999999996, 0.035, 0);

    PrimitiveFieldFunction primitiveFieldFunction_0 = 
      ((PrimitiveFieldFunction) simulation_0.getFieldFunctionManager().getFunction("Pressure"));

    scalarDisplayer_0.getScalarDisplayQuantity().setFieldFunction(primitiveFieldFunction_0);

    scalarDisplayer_0.getScalarDisplayQuantity().getMinimumValue().setValueAndUnits(0.0, units_1);

    scalarDisplayer_0.getScalarDisplayQuantity().getMaximumValue().setValueAndUnits(0.0, units_1);

    scalarDisplayer_0.getScalarDisplayQuantity().setClip(ClipMode.NONE);

    scalarDisplayer_0.getScalarDisplayQuantity().setAutoRange(AutoRangeMode.BOTH);

    PredefinedLookupTable predefinedLookupTable_0 = 
      ((PredefinedLookupTable) simulation_0.get(LookupTableManager.class).getObject("blue-yellow-red"));

    legend_0.setLookupTable(predefinedLookupTable_0);

    LatestMeshProxyRepresentation latestMeshProxyRepresentation_0 = 
      ((LatestMeshProxyRepresentation) simulation_0.getRepresentationManager().getObject("Latest Surface/Volume"));

    scalarDisplayer_0.setRepresentation(latestMeshProxyRepresentation_0);

    scene_1.setTransparencyOverrideMode(SceneTransparencyOverride.MAKE_SCENE_TRANSPARENT);

    scene_1.getCreatorGroup().setQuery(null);

    scene_1.getCreatorGroup().setObjects(region_0);

    StreamDisplayer streamDisplayer_0 = 
      scene_1.getDisplayerManager().createStreamDisplayer("Streamline Stream");

    scene_1.setTransparencyOverrideMode(SceneTransparencyOverride.MAKE_SCENE_TRANSPARENT);

    PrimitiveFieldFunction primitiveFieldFunction_1 = 
      ((PrimitiveFieldFunction) simulation_0.getFieldFunctionManager().getFunction("Velocity"));

    StreamPart streamPart_0 = 
      simulation_0.getPartManager().createStreamPart(new ArrayList<>(Arrays.<NamedObject>asList(region_0)), new ArrayList<>(bodyBoundaries), primitiveFieldFunction_1, 15, 15, 0, null);

    streamDisplayer_0.getVisibleParts().addParts(streamPart_0);

    streamDisplayer_0.getHiddenParts().addParts();

    Legend legend_1 = 
      streamDisplayer_0.getLegend();

    legend_1.updateLayout(new DoubleVector(new double[] {0.73, 0.18}), 0.19999999999999996, 0.035, 0);

    VectorMagnitudeFieldFunction vectorMagnitudeFieldFunction_0 = 
      ((VectorMagnitudeFieldFunction) primitiveFieldFunction_1.getMagnitudeFunction());

    streamDisplayer_0.getScalarDisplayQuantity().setFieldFunction(vectorMagnitudeFieldFunction_0);

    streamDisplayer_0.getScalarDisplayQuantity().getMinimumValue().setValueAndUnits(0.0, units_2);

    streamDisplayer_0.getScalarDisplayQuantity().getMaximumValue().setValueAndUnits(0.0, units_2);

    streamDisplayer_0.getScalarDisplayQuantity().setClip(ClipMode.NONE);

    streamDisplayer_0.getScalarDisplayQuantity().setAutoRange(AutoRangeMode.BOTH);

    legend_1.setLookupTable(predefinedLookupTable_0);

    streamDisplayer_0.setRepresentation(latestMeshProxyRepresentation_0);
    scene_1.resetCamera();
    simulation_0.println("SETUP COMPLETE: drag +X, downforce -Z; " + bodyBoundaries.size() + " body surfaces.");
    simulation_0.println("Inspect the domain, boundaries, physics and mesh before running the solver.");
  }

  private static String surfaceTag(String name, Set<String> expected) {
    for (String tag : expected)
      if (name.equals(tag) || name.endsWith("." + tag)) return tag;
    return null;
  }

  private static Boundary findBoundary(Region region, String tag) {
    Boundary match = null;
    for (Boundary boundary : region.getBoundaryManager().getBoundaries()) {
      String name = boundary.getPresentationName();
      if (name.equals(tag) || name.endsWith("." + tag)) {
        if (match != null) throw new IllegalStateException("Ambiguous boundary: " + tag);
        match = boundary;
      }
    }
    if (match == null) throw new IllegalStateException("Missing boundary: " + tag);
    return match;
  }

  // Narrow compatibility adapter for numeric selection codes serialized by STAR.
  // Never interpret an enum ordinal as its saved code; fail if the API cannot map it.
  private static void setSavedSelection(Object option, int code) {
    try {
      try {
        option.getClass().getMethod("setSelected", int.class).invoke(option, code);
        return;
      } catch (NoSuchMethodException noIntegerSetter) {
        for (java.lang.reflect.Method setter : option.getClass().getMethods()) {
          if (!setter.getName().equals("setSelected") || setter.getParameterCount() != 1) continue;
          Class<?> type = setter.getParameterTypes()[0];
          if (!type.isEnum()) continue;
          for (Object value : type.getEnumConstants()) {
            java.lang.reflect.Method valueMethod;
            try { valueMethod = type.getMethod("getValue"); }
            catch (NoSuchMethodException absent) { continue; }
            Object numeric = valueMethod.invoke(value);
            if (numeric instanceof Number && ((Number) numeric).intValue() == code) {
              setter.invoke(option, value);
              return;
            }
          }
        }
        throw new IllegalStateException("No numeric option mapping on " + option.getClass().getName());
      }
    } catch (Exception error) {
      throw new IllegalStateException("Cannot apply saved option " + code + " to "
          + option.getClass().getName() + "; please provide the recorded setter from STAR.", error);
    }
  }
}
