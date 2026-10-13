// Native refinement experiment for STAR-CCM+ 21.04.008.
// This macro never reads coordinates or creates a simulation domain.
package macro;

import java.util.*;
import star.common.*;
import star.meshing.*;
import star.resurfacer.*;
import star.trimmer.*;

public class AttachRefinementMacro extends StarMacro {
  private static final String PART_NAME = "Part 6__Part 6";
  // Leave blank to select the only existing automated mesh operation.
  private static final String MESH_OPERATION_NAME = "";
  private static final double LOCAL_SIZE_PERCENT = 2.0;

  @Override
  public void execute() {
    Simulation sim = getActiveSimulation();
    GeometryPart source = sim.get(SimulationPartManager.class).getPart(PART_NAME);
    if (!(source instanceof CadPart))
      throw new IllegalStateException("Choose an imported CAD part: " + PART_NAME);
    for (GeometryPart existing : sim.get(SimulationPartManager.class).getParts())
      if (existing.getPresentationName().equals("KM_Test_Refinement"))
        throw new IllegalStateException("KM_Test_Refinement already exists. Reopen the saved simulation before repeating this test.");

    List<AutoMeshOperation> meshers = new ArrayList<>();
    for (Object candidate : sim.get(MeshOperationManager.class).getObjects()) {
      if (!(candidate instanceof AutoMeshOperation)) continue;
      AutoMeshOperation mesher = (AutoMeshOperation) candidate;
      if (MESH_OPERATION_NAME.isEmpty() || mesher.getPresentationName().equals(MESH_OPERATION_NAME))
        meshers.add(mesher);
    }
    if (meshers.size() > 1)
      throw new IllegalStateException("Several automated mesh operations exist. Set MESH_OPERATION_NAME before running.");
    if (!MESH_OPERATION_NAME.isEmpty() && meshers.isEmpty())
      throw new IllegalStateException("Automated mesh operation not found: " + MESH_OPERATION_NAME);
    if (!Double.isFinite(LOCAL_SIZE_PERCENT) || LOCAL_SIZE_PERCENT <= 0 || LOCAL_SIZE_PERCENT > 100)
      throw new IllegalStateException("LOCAL_SIZE_PERCENT must be in (0, 100].");

    // Exactly the native creation sequence established by TestMacroTwo.java.
    BoundedShapeCreatingOperation operation = (BoundedShapeCreatingOperation)
        sim.get(MeshOperationManager.class).createBoundedShapeOperation(
            new ArrayList<>(Arrays.<GeometryPart>asList(source)));
    operation.setPresentationName("KM_Test_Refinement_Bounds");
    operation.setCoordinateSystem(sim.getCoordinateSystemManager().getLabCoordinateSystem());
    operation.getBoundedShapeValuesManager().get(BoxShapeInflationControl.class)
        .setInflationMode(BoxShapeInflationControl.InflationMode.CONSTANT_OFFSET);
    operation.execute();

    // The operation API supplied by the user exposes its output objects directly.
    List<GeometryPart> outputs = new ArrayList<>();
    for (Object candidate : operation.getOutputPartObjects())
      if (candidate instanceof GeometryPart) outputs.add((GeometryPart) candidate);
    if (outputs.size() != 1)
      throw new IllegalStateException("Expected one bounded shape output, found " + outputs.size());
    GeometryPart volume = outputs.get(0);
    volume.setPresentationName("KM_Test_Refinement");
    sim.println("REFINEMENT CREATED: " + volume.getClass().getName() + " around " + PART_NAME);

    if (meshers.isEmpty()) {
      sim.println("No automated mesher exists. Inspect KM_Test_Refinement under Geometry > Parts.");
      sim.println("The bounded operation takes the imported part as input; no corner-reading step was used.");
      return;
    }
    AutoMeshOperation mesher = meshers.get(0);
    VolumeCustomMeshControl control = mesher.getCustomMeshControls().createVolumeControl();
    control.setPresentationName("KM_Test_Body_Refinement");
    control.getGeometryObjects().setQuery(null);
    control.getGeometryObjects().setObjects(volume);
    control.getCustomConditions().get(VolumeControlResurfacerSizeOption.class).setVolumeControlBaseSizeOption(true);
    control.getCustomConditions().get(VolumeControlTrimmerSizeOption.class).setVolumeControlBaseSizeOption(true);
    VolumeControlSize size = control.getCustomValues().get(VolumeControlSize.class);
    size.getRelativeOrAbsoluteOption().setSelected(RelativeOrAbsoluteOption.Type.RELATIVE);
    size.getRelativeSizeScalar().setValue(LOCAL_SIZE_PERCENT);
    sim.println("REFINEMENT ATTACHED: " + mesher.getPresentationName() + "; cell size " + LOCAL_SIZE_PERCENT + "% of base.");
    sim.println("Inspect the volume and control. Mesh generation was not requested.");
  }
}
